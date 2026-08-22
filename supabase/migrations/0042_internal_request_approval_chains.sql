-- محرك اعتمادات عام متعدد الخطوات لطلبات "طلباتي" (internal_requests): يستبدل الاعتماد
-- بخطوة واحدة (شخص محدد أو رئيس قسم) بسلسلة يبنيها رافع الطلب بنفسه وقت التقديم — إما
-- من قالب جاهز قابل لإعادة الاستخدام أو مبنية بالكامل يدوياً — خطية (تسلسل بسيط) أو
-- شبكية (تسمح لأي معتمد بإرجاع الطلب لمرحلة سابقة بدل الرفض النهائي).
--
-- كل مرحلة إما شخص محدد بالاسم أو قسم (يُوجَّه لاحقاً لموظف داخله من رئيس ذاك القسم —
-- توجيه فقط، لا يُحسب كموافقة). الاعتماد يتم بالتسلسل الصارم: كل مرحلة تنتظر اعتماد
-- اللي قبلها. أي شخص وصل الدور له فعلاً يقدر يضيف معتمداً إضافياً قبل مرحلته هو.
--
-- الجداول والدوال هنا منفصلة الأسماء عمداً عن أي عمل مواز يخص "طلبات المواد" (لو وُجد
-- مستقبلاً) لتفادي أي تعارض تسمية عند الدمج لاحقاً — نفس النمط والاصطلاحات (routing/
-- insert/review) يسهّل توحيدهما لاحقاً لو احتاج الأمر. جدول القوالب (approval_chain_
-- templates) بلا استثناء مُبقى عاماً بلا بادئة لأنه لا يحمل أي مرجع لنوع الطلب أصلاً.

-- ===== إزالة نمط الاعتماد بخطوة واحدة القديم =====
drop policy if exists "reviewers read internal_requests" on public.internal_requests;
drop policy if exists "user reads own internal_requests" on public.internal_requests;
drop policy if exists "user inserts own internal_requests" on public.internal_requests;

drop function if exists public.review_internal_request(uuid, boolean, text);
drop function if exists public.can_review_request(uuid);

alter table public.internal_requests drop column department_id;
alter table public.internal_requests drop column target_user_id;
alter table public.internal_requests drop column attachment_url;
alter table public.internal_requests drop column reviewed_by;
alter table public.internal_requests drop column reviewed_at;
alter table public.internal_requests drop column review_note;

-- رئيس قسم محدد بذاته (بغض النظر عن نوعه) — يُستخدم لتوجيه خطوة "قسم" لشخص مسؤول.
create or replace function public.is_department_head(p_department_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    public.can_manage_org((select company_id from public.departments where id = p_department_id))
    or exists (
      select 1 from public.department_members dm
      where dm.department_id = p_department_id and dm.user_id = auth.uid() and dm.role = 'head'
    );
$$;

-- ===== قوالب سلاسل اعتماد قابلة لإعادة الاستخدام (عامة، تصلح لأي نوع طلب مستقبلاً) =====
create table public.approval_chain_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  chain_type text not null default 'linear' check (chain_type in ('linear', 'network')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index approval_chain_templates_company_id_idx on public.approval_chain_templates (company_id);

create table public.approval_chain_template_steps (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.approval_chain_templates (id) on delete cascade,
  step_order integer not null,
  department_id uuid references public.departments (id) on delete set null,
  assigned_user_id uuid references public.profiles (id) on delete set null,
  unique (template_id, step_order),
  check (department_id is not null or assigned_user_id is not null)
);

alter table public.approval_chain_templates enable row level security;
alter table public.approval_chain_template_steps enable row level security;

create policy "company members read chain templates" on public.approval_chain_templates
  for select using (company_id = (select company_id from public.profiles where id = auth.uid()));

create policy "company members read chain template steps" on public.approval_chain_template_steps
  for select using (
    template_id in (
      select id from public.approval_chain_templates
      where company_id = (select company_id from public.profiles where id = auth.uid())
    )
  );

create or replace function public.create_approval_chain_template(p_name text, p_chain_type text, p_steps jsonb)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
  v_template_id uuid;
  v_step jsonb;
  v_order integer := 0;
begin
  select company_id into v_company_id from public.profiles where id = auth.uid();
  if v_company_id is null then
    raise exception 'لا تنتمي لأي شركة';
  end if;
  if p_name is null or trim(p_name) = '' then
    raise exception 'لازم اسم للقالب';
  end if;
  if p_steps is null or jsonb_array_length(p_steps) = 0 then
    raise exception 'لازم خطوة اعتماد واحدة على الأقل';
  end if;

  insert into public.approval_chain_templates (company_id, name, chain_type, created_by)
  values (v_company_id, trim(p_name), coalesce(p_chain_type, 'linear'), auth.uid())
  returning id into v_template_id;

  for v_step in select * from jsonb_array_elements(p_steps) loop
    v_order := v_order + 1;
    insert into public.approval_chain_template_steps (template_id, step_order, department_id, assigned_user_id)
    values (v_template_id, v_order, nullif(v_step->>'department_id', '')::uuid, nullif(v_step->>'user_id', '')::uuid);
  end loop;

  return v_template_id;
end;
$$;

grant execute on function public.create_approval_chain_template(text, text, jsonb) to authenticated;

create or replace function public.delete_approval_chain_template(p_template_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
  v_created_by uuid;
begin
  select company_id, created_by into v_company_id, v_created_by
  from public.approval_chain_templates where id = p_template_id;
  if v_company_id is null then
    raise exception 'القالب غير موجود';
  end if;
  if v_created_by <> auth.uid() and not public.can_manage_org(v_company_id) then
    raise exception 'لا تملك صلاحية حذف هذا القالب';
  end if;
  delete from public.approval_chain_templates where id = p_template_id;
end;
$$;

grant execute on function public.delete_approval_chain_template(uuid) to authenticated;

-- ===== سلاسل الاعتماد الفعلية لكل طلب داخلي =====
create table public.internal_approval_chains (
  id uuid primary key default gen_random_uuid(),
  internal_request_id uuid not null references public.internal_requests (id) on delete cascade,
  chain_type text not null default 'linear' check (chain_type in ('linear', 'network')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  requester_note text
);

create index internal_approval_chains_request_id_idx on public.internal_approval_chains (internal_request_id);

create table public.internal_approval_chain_steps (
  id uuid primary key default gen_random_uuid(),
  chain_id uuid not null references public.internal_approval_chains (id) on delete cascade,
  step_order integer not null,
  department_id uuid references public.departments (id) on delete set null,
  assigned_user_id uuid references public.profiles (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'skipped')),
  routed_by uuid references public.profiles (id) on delete set null,
  routed_at timestamptz,
  acted_by uuid references public.profiles (id) on delete set null,
  acted_at timestamptz,
  note text,
  inserted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (chain_id, step_order),
  check (department_id is not null or assigned_user_id is not null)
);

create index internal_approval_chain_steps_chain_id_idx on public.internal_approval_chain_steps (chain_id);

alter table public.internal_approval_chains enable row level security;
alter table public.internal_approval_chain_steps enable row level security;

-- من يملك صلاحية رؤية طلب داخلي: صاحب الطلب، أي شخص وُجِّهت له خطوة (حالياً أو سابقاً)،
-- أي رئيس قسم لخطوة موجّهة لقسمه (حتى قبل التوجيه لشخص، ليقدر يوجّه)، أو مدير الحساب/
-- الإدارة التنفيذية.
create or replace function public.can_view_internal_request(p_request_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    exists (select 1 from public.internal_requests r where r.id = p_request_id and r.user_id = auth.uid())
    or public.can_manage_org((select company_id from public.internal_requests where id = p_request_id))
    or exists (
      select 1
      from public.internal_approval_chains ac
      join public.internal_approval_chain_steps s on s.chain_id = ac.id
      where ac.internal_request_id = p_request_id
        and (
          s.assigned_user_id = auth.uid()
          or (s.department_id is not null and public.is_department_head(s.department_id))
        )
    );
$$;

create policy "scoped read internal_requests" on public.internal_requests
  for select using (public.can_view_internal_request(id));

create policy "scoped read internal_approval_chains" on public.internal_approval_chains
  for select using (public.can_view_internal_request(internal_request_id));

create policy "scoped read internal_approval_chain_steps" on public.internal_approval_chain_steps
  for select using (
    chain_id in (select id from public.internal_approval_chains where public.can_view_internal_request(internal_request_id))
  );

-- ===== تقديم طلب جديد + سلسلة اعتماده دفعة واحدة (من قالب أو مبنية يدوياً) =====
create or replace function public.create_internal_request(
  p_type text,
  p_title text,
  p_description text,
  p_start_date date,
  p_end_date date,
  p_chain_type text,
  p_steps jsonb,
  p_note text,
  p_template_id uuid
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
  v_request_id uuid;
  v_chain_id uuid;
  v_chain_type text;
  v_steps jsonb;
  v_step jsonb;
  v_order integer := 0;
begin
  select company_id into v_company_id from public.profiles where id = auth.uid();
  if v_company_id is null then
    raise exception 'لا تنتمي لأي شركة';
  end if;
  if p_title is null or trim(p_title) = '' then
    raise exception 'لازم عنوان للطلب';
  end if;

  if p_template_id is not null then
    select chain_type into v_chain_type from public.approval_chain_templates
    where id = p_template_id and company_id = v_company_id;
    if v_chain_type is null then
      raise exception 'القالب غير موجود';
    end if;
    select jsonb_agg(jsonb_build_object('department_id', department_id, 'user_id', assigned_user_id) order by step_order)
    into v_steps
    from public.approval_chain_template_steps where template_id = p_template_id;
  else
    v_chain_type := coalesce(p_chain_type, 'linear');
    v_steps := p_steps;
  end if;

  if v_chain_type not in ('linear', 'network') then
    raise exception 'نوع سلسلة غير صالح';
  end if;
  if v_steps is null or jsonb_array_length(v_steps) = 0 then
    raise exception 'لازم تحديد جهة اعتماد واحدة على الأقل';
  end if;

  insert into public.internal_requests (company_id, user_id, type, title, description, start_date, end_date, status)
  values (
    v_company_id, auth.uid(), p_type, trim(p_title), nullif(trim(coalesce(p_description, '')), ''),
    p_start_date, p_end_date, 'pending'
  )
  returning id into v_request_id;

  insert into public.internal_approval_chains (internal_request_id, chain_type, created_by, requester_note)
  values (v_request_id, v_chain_type, auth.uid(), p_note)
  returning id into v_chain_id;

  for v_step in select * from jsonb_array_elements(v_steps) loop
    v_order := v_order + 1;
    insert into public.internal_approval_chain_steps (chain_id, step_order, department_id, assigned_user_id)
    values (v_chain_id, v_order, nullif(v_step->>'department_id', '')::uuid, nullif(v_step->>'user_id', '')::uuid);
  end loop;

  return v_request_id;
end;
$$;

grant execute on function public.create_internal_request(text, text, text, date, date, text, jsonb, text, uuid) to authenticated;

-- ===== توجيه مرحلة "قسم" لشخص مسؤول محدد (رئيس القسم فقط) — توجيه لا يُحسب موافقة =====
create or replace function public.route_internal_approval_step(p_step_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_department_id uuid;
  v_assigned_user_id uuid;
  v_step_status text;
  v_chain_status text;
begin
  select chain_id, step_order, department_id, assigned_user_id, status
  into v_chain_id, v_step_order, v_department_id, v_assigned_user_id, v_step_status
  from public.internal_approval_chain_steps where id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;
  select status into v_chain_status from public.internal_approval_chains where id = v_chain_id;
  if v_chain_status <> 'pending' then
    raise exception 'سلسلة الاعتماد هذه غير نشطة حالياً';
  end if;
  if v_step_status <> 'pending' then
    raise exception 'هذه المرحلة ليست بانتظار إجراء';
  end if;
  if v_department_id is null then
    raise exception 'هذه المرحلة موجّهة لشخص محدد مسبقاً، لا تحتاج تحويل';
  end if;
  if v_assigned_user_id is not null then
    raise exception 'هذه المرحلة محوّلة مسبقاً';
  end if;
  if exists (
    select 1 from public.internal_approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> 'approved'
  ) then
    raise exception 'لم يصل الدور لهذه المرحلة بعد';
  end if;
  if not public.is_department_head(v_department_id) then
    raise exception 'لا تملك صلاحية توجيه طلبات هذا القسم (رئيس القسم فقط)';
  end if;

  update public.internal_approval_chain_steps
  set assigned_user_id = p_user_id, routed_by = auth.uid(), routed_at = now()
  where id = p_step_id;
end;
$$;

grant execute on function public.route_internal_approval_step(uuid, uuid) to authenticated;

-- ===== إضافة معتمد إضافي قبل مرحلة نشطة — فقط من الشخص الوصل له الدور فعلاً =====
create or replace function public.insert_internal_approval_step(p_step_id uuid, p_department_id uuid, p_user_id uuid, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_assigned_user_id uuid;
  v_step_status text;
  v_chain_status text;
  v_company_id uuid;
begin
  select acs.chain_id, acs.step_order, acs.assigned_user_id, acs.status
  into v_chain_id, v_step_order, v_assigned_user_id, v_step_status
  from public.internal_approval_chain_steps acs where acs.id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;
  select ac.status, r.company_id into v_chain_status, v_company_id
  from public.internal_approval_chains ac
  join public.internal_requests r on r.id = ac.internal_request_id
  where ac.id = v_chain_id;

  if v_chain_status <> 'pending' then
    raise exception 'سلسلة الاعتماد هذه غير نشطة حالياً';
  end if;
  if v_step_status <> 'pending' then
    raise exception 'هذه المرحلة ليست بانتظار إجراء';
  end if;
  if exists (
    select 1 from public.internal_approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> 'approved'
  ) then
    raise exception 'لم يصل الدور لهذه المرحلة بعد';
  end if;
  if (v_assigned_user_id is null or v_assigned_user_id <> auth.uid()) and not public.can_manage_org(v_company_id) then
    raise exception 'فقط الشخص المطلوب اعتماده بهذه المرحلة يقدر يضيف معتمداً إضافياً قبله';
  end if;
  if p_department_id is null and p_user_id is null then
    raise exception 'لازم تحديد قسم أو شخص للمعتمد الإضافي';
  end if;

  update public.internal_approval_chain_steps
  set step_order = step_order + 1
  where chain_id = v_chain_id and step_order >= v_step_order;

  insert into public.internal_approval_chain_steps (chain_id, step_order, department_id, assigned_user_id, inserted_by, note)
  values (v_chain_id, v_step_order, p_department_id, p_user_id, auth.uid(), p_note);
end;
$$;

grant execute on function public.insert_internal_approval_step(uuid, uuid, uuid, text) to authenticated;

-- ===== اعتماد/رفض مرحلة نشطة — فقط الشخص المعيّن لها فعلياً؛ الرفض يوقف السلسلة كاملة =====
create or replace function public.review_internal_approval_step(p_step_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_assigned_user_id uuid;
  v_step_status text;
  v_chain_status text;
  v_request_id uuid;
  v_company_id uuid;
  v_max_order integer;
begin
  select acs.chain_id, acs.step_order, acs.assigned_user_id, acs.status
  into v_chain_id, v_step_order, v_assigned_user_id, v_step_status
  from public.internal_approval_chain_steps acs where acs.id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;

  select ac.status, ac.internal_request_id, r.company_id
  into v_chain_status, v_request_id, v_company_id
  from public.internal_approval_chains ac
  join public.internal_requests r on r.id = ac.internal_request_id
  where ac.id = v_chain_id;

  if v_chain_status <> 'pending' then
    raise exception 'سلسلة الاعتماد هذه غير نشطة حالياً';
  end if;
  if v_step_status <> 'pending' then
    raise exception 'هذه المرحلة ليست بانتظار إجراء';
  end if;
  if exists (
    select 1 from public.internal_approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> 'approved'
  ) then
    raise exception 'لم يصل الدور لهذه المرحلة بعد';
  end if;
  if v_assigned_user_id is null then
    raise exception 'يلزم توجيه هذه المرحلة لشخص محدد قبل اعتمادها';
  end if;
  if v_assigned_user_id <> auth.uid() and not public.can_manage_org(v_company_id) then
    raise exception 'لا تملك صلاحية الاعتماد على هذه المرحلة';
  end if;
  if not p_approve and (p_note is null or trim(p_note) = '') then
    raise exception 'لازم توضيح سبب الرفض';
  end if;

  update public.internal_approval_chain_steps
  set status = case when p_approve then 'approved' else 'rejected' end,
      acted_by = auth.uid(), acted_at = now(), note = p_note
  where id = p_step_id;

  if not p_approve then
    update public.internal_approval_chain_steps set status = 'skipped' where chain_id = v_chain_id and status = 'pending';
    update public.internal_approval_chains set status = 'rejected', decided_at = now() where id = v_chain_id;
    update public.internal_requests set status = 'rejected' where id = v_request_id;
  else
    select max(step_order) into v_max_order from public.internal_approval_chain_steps where chain_id = v_chain_id;
    if v_step_order = v_max_order then
      update public.internal_approval_chains set status = 'approved', decided_at = now() where id = v_chain_id;
      update public.internal_requests set status = 'approved' where id = v_request_id;
    end if;
  end if;
end;
$$;

grant execute on function public.review_internal_approval_step(uuid, boolean, text) to authenticated;

-- ===== إرجاع مرحلة نشطة لمرحلة سابقة (سلاسل "شبكية" فقط) بدل الرفض النهائي — يعيد
-- كل المراحل من الهدف حتى الحالية لحالة "بانتظار" من جديد بدل إيقاف السلسلة =====
create or replace function public.send_back_internal_approval_step(p_step_id uuid, p_target_step_id uuid, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_assigned_user_id uuid;
  v_step_status text;
  v_chain_status text;
  v_chain_type text;
  v_company_id uuid;
  v_target_chain_id uuid;
  v_target_order integer;
begin
  select acs.chain_id, acs.step_order, acs.assigned_user_id, acs.status
  into v_chain_id, v_step_order, v_assigned_user_id, v_step_status
  from public.internal_approval_chain_steps acs where acs.id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;

  select ac.status, ac.chain_type, r.company_id
  into v_chain_status, v_chain_type, v_company_id
  from public.internal_approval_chains ac
  join public.internal_requests r on r.id = ac.internal_request_id
  where ac.id = v_chain_id;

  if v_chain_type <> 'network' then
    raise exception 'الإرجاع لمرحلة سابقة متاح فقط للسلاسل الشبكية';
  end if;
  if v_chain_status <> 'pending' then
    raise exception 'سلسلة الاعتماد هذه غير نشطة حالياً';
  end if;
  if v_step_status <> 'pending' then
    raise exception 'هذه المرحلة ليست بانتظار إجراء';
  end if;
  if exists (
    select 1 from public.internal_approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> 'approved'
  ) then
    raise exception 'لم يصل الدور لهذه المرحلة بعد';
  end if;
  if v_assigned_user_id is null then
    raise exception 'يلزم توجيه هذه المرحلة لشخص محدد قبل التصرف بها';
  end if;
  if v_assigned_user_id <> auth.uid() and not public.can_manage_org(v_company_id) then
    raise exception 'لا تملك صلاحية إرجاع هذه المرحلة';
  end if;
  if p_note is null or trim(p_note) = '' then
    raise exception 'لازم توضيح سبب الإرجاع';
  end if;

  select chain_id, step_order into v_target_chain_id, v_target_order
  from public.internal_approval_chain_steps where id = p_target_step_id;

  if v_target_chain_id is distinct from v_chain_id then
    raise exception 'المرحلة المستهدفة ليست ضمن نفس السلسلة';
  end if;
  if v_target_order >= v_step_order then
    raise exception 'الإرجاع يكون فقط لمرحلة سابقة';
  end if;

  update public.internal_approval_chain_steps
  set status = 'pending', acted_by = null, acted_at = null,
      note = case when id = p_target_step_id then p_note else null end
  where chain_id = v_chain_id and step_order between v_target_order and v_step_order;
end;
$$;

grant execute on function public.send_back_internal_approval_step(uuid, uuid, text) to authenticated;

-- ===== مرفقات متعددة بسجل نسخ (revisions) كامل — أي عدد، أي صيغة، بلا حد حجم مصطنع =====
create table public.internal_request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.internal_requests (id) on delete cascade,
  file_name text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index internal_request_attachments_request_id_idx on public.internal_request_attachments (request_id);

create table public.internal_request_attachment_revisions (
  id uuid primary key default gen_random_uuid(),
  attachment_id uuid not null references public.internal_request_attachments (id) on delete cascade,
  revision_number integer not null,
  file_url text not null,
  uploaded_by uuid references public.profiles (id) on delete set null,
  uploaded_at timestamptz not null default now(),
  note text,
  unique (attachment_id, revision_number)
);

create index internal_request_attachment_revisions_attachment_id_idx on public.internal_request_attachment_revisions (attachment_id);

alter table public.internal_request_attachments enable row level security;
alter table public.internal_request_attachment_revisions enable row level security;

create policy "scoped read internal_request_attachments" on public.internal_request_attachments
  for select using (public.can_view_internal_request(request_id));

create policy "scoped read internal_request_attachment_revisions" on public.internal_request_attachment_revisions
  for select using (
    attachment_id in (select id from public.internal_request_attachments where public.can_view_internal_request(request_id))
  );

create or replace function public.add_internal_request_attachment(p_request_id uuid, p_file_name text, p_file_url text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_attachment_id uuid;
begin
  if not public.can_view_internal_request(p_request_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا الطلب';
  end if;
  if p_file_name is null or trim(p_file_name) = '' or p_file_url is null or trim(p_file_url) = '' then
    raise exception 'لازم اسم ورابط الملف';
  end if;

  insert into public.internal_request_attachments (request_id, file_name, created_by)
  values (p_request_id, trim(p_file_name), auth.uid())
  returning id into v_attachment_id;

  insert into public.internal_request_attachment_revisions (attachment_id, revision_number, file_url, uploaded_by)
  values (v_attachment_id, 1, p_file_url, auth.uid());

  return v_attachment_id;
end;
$$;

grant execute on function public.add_internal_request_attachment(uuid, text, text) to authenticated;

create or replace function public.add_internal_request_attachment_revision(p_attachment_id uuid, p_file_url text, p_note text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_request_id uuid;
  v_next_revision integer;
  v_revision_id uuid;
begin
  select request_id into v_request_id from public.internal_request_attachments where id = p_attachment_id;
  if v_request_id is null then
    raise exception 'المرفق غير موجود';
  end if;
  if not public.can_view_internal_request(v_request_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا الطلب';
  end if;
  if p_file_url is null or trim(p_file_url) = '' then
    raise exception 'لازم رابط الملف';
  end if;

  select coalesce(max(revision_number), 0) + 1 into v_next_revision
  from public.internal_request_attachment_revisions where attachment_id = p_attachment_id;

  insert into public.internal_request_attachment_revisions (attachment_id, revision_number, file_url, uploaded_by, note)
  values (p_attachment_id, v_next_revision, p_file_url, auth.uid(), p_note)
  returning id into v_revision_id;

  return v_revision_id;
end;
$$;

grant execute on function public.add_internal_request_attachment_revision(uuid, text, text) to authenticated;

-- ===== سجل تدقيق تلقائي (نفس نمط audit_contracts/audit_material_requests بـ 0040) =====
create or replace function public.audit_internal_requests()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    coalesce(new.company_id, old.company_id), 'internal_requests', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger internal_requests_audit after insert or update or delete on public.internal_requests
  for each row execute function public.audit_internal_requests();

create or replace function public.audit_internal_approval_chains()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select company_id into v_company_id from public.internal_requests where id = coalesce(new.internal_request_id, old.internal_request_id);
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, 'internal_approval_chains', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger internal_approval_chains_audit after insert or update or delete on public.internal_approval_chains
  for each row execute function public.audit_internal_approval_chains();

create or replace function public.audit_internal_approval_chain_steps()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select r.company_id into v_company_id
  from public.internal_approval_chains ac join public.internal_requests r on r.id = ac.internal_request_id
  where ac.id = coalesce(new.chain_id, old.chain_id);
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, 'internal_approval_chain_steps', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger internal_approval_chain_steps_audit after insert or update or delete on public.internal_approval_chain_steps
  for each row execute function public.audit_internal_approval_chain_steps();

create or replace function public.audit_internal_request_attachments()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select company_id into v_company_id from public.internal_requests where id = coalesce(new.request_id, old.request_id);
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, 'internal_request_attachments', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger internal_request_attachments_audit after insert or update or delete on public.internal_request_attachments
  for each row execute function public.audit_internal_request_attachments();

create or replace function public.audit_internal_request_attachment_revisions()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select r.company_id into v_company_id
  from public.internal_request_attachments a join public.internal_requests r on r.id = a.request_id
  where a.id = coalesce(new.attachment_id, old.attachment_id);
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, 'internal_request_attachment_revisions', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger internal_request_attachment_revisions_audit after insert or update or delete on public.internal_request_attachment_revisions
  for each row execute function public.audit_internal_request_attachment_revisions();
