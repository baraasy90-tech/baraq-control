-- تطوير "طلباتي" حسب طلب المستخدم:
-- 1) توسيع أنواع الطلب: استفسار/اعتراض/شكوى/اعتماد (جديدة) + إبقاء إجازة/تجديد عقد
--    (لا تزال مستخدمة لحقول تاريخ الإجازة بالموارد البشرية) — "أمر آخر" يبقى بنفس
--    القيمة 'other' بقاعدة البيانات لكن تُعرض بالواجهة كـ"عام" (لا حاجة لتغيير القيمة).
-- 2) نظام تنبيهات فعلي: صف تنبيه لكل شخص كلما وُجِّهت له خطوة اعتماد، أو تحرّكت خطوة
--    تخصّه، أو صدر قرار نهائي على طلبه هو. يُدرَج تلقائياً من نفس دوال RPC الحالية.
-- (مدة كل مرحلة تُحسب مباشرة بالواجهة من routed_at/acted_at الموجودين أصلاً، فلا
-- حاجة لعمود جديد لها.)

alter table public.internal_requests drop constraint if exists internal_requests_type_check;
alter table public.internal_requests add constraint internal_requests_type_check
  check (type in ('leave', 'contract_renewal', 'other', 'inquiry', 'objection', 'complaint', 'approval'));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "users read own notifications" on public.notifications
  for select using (user_id = auth.uid());

create policy "users mark own notifications read" on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.notify_user(
  p_company_id uuid, p_user_id uuid, p_title text, p_body text, p_link text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;
  insert into public.notifications (company_id, user_id, title, body, link)
  values (p_company_id, p_user_id, p_title, p_body, p_link);
end;
$$;

-- ===== إعادة تعريف دوال سلسلة الاعتماد لإضافة تنبيهات تلقائية =====

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
  v_first_user uuid;
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

    if v_order = 1 then
      v_first_user := nullif(v_step->>'user_id', '')::uuid;
    end if;
  end loop;

  if v_first_user is not null then
    perform public.notify_user(
      v_company_id, v_first_user, 'طلب جديد بانتظار اعتمادك',
      trim(p_title), '/my-requests'
    );
  end if;

  return v_request_id;
end;
$$;

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
  v_company_id uuid;
  v_title text;
begin
  select chain_id, step_order, department_id, assigned_user_id, status
  into v_chain_id, v_step_order, v_department_id, v_assigned_user_id, v_step_status
  from public.internal_approval_chain_steps where id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;
  select ac.status, r.company_id, r.title into v_chain_status, v_company_id, v_title
  from public.internal_approval_chains ac
  join public.internal_requests r on r.id = ac.internal_request_id
  where ac.id = v_chain_id;

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

  perform public.notify_user(v_company_id, p_user_id, 'طلب موجَّه إليك للاعتماد', v_title, '/my-requests');
end;
$$;

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
  v_title text;
  v_owner_id uuid;
  v_max_order integer;
  v_next_step_id uuid;
  v_next_assigned uuid;
begin
  select acs.chain_id, acs.step_order, acs.assigned_user_id, acs.status
  into v_chain_id, v_step_order, v_assigned_user_id, v_step_status
  from public.internal_approval_chain_steps acs where acs.id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;

  select ac.status, ac.internal_request_id, r.company_id, r.title, r.user_id
  into v_chain_status, v_request_id, v_company_id, v_title, v_owner_id
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
    perform public.notify_user(v_company_id, v_owner_id, 'رُفض طلبك', v_title, '/my-requests');
  else
    select max(step_order) into v_max_order from public.internal_approval_chain_steps where chain_id = v_chain_id;
    if v_step_order = v_max_order then
      update public.internal_approval_chains set status = 'approved', decided_at = now() where id = v_chain_id;
      update public.internal_requests set status = 'approved' where id = v_request_id;
      perform public.notify_user(v_company_id, v_owner_id, 'تم اعتماد طلبك', v_title, '/my-requests');
    else
      select id, assigned_user_id into v_next_step_id, v_next_assigned
      from public.internal_approval_chain_steps
      where chain_id = v_chain_id and step_order > v_step_order
      order by step_order limit 1;
      if v_next_assigned is not null then
        perform public.notify_user(v_company_id, v_next_assigned, 'طلب بانتظار اعتمادك', v_title, '/my-requests');
      end if;
    end if;
  end if;
end;
$$;

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
  v_title text;
  v_target_chain_id uuid;
  v_target_order integer;
  v_target_assigned uuid;
begin
  select acs.chain_id, acs.step_order, acs.assigned_user_id, acs.status
  into v_chain_id, v_step_order, v_assigned_user_id, v_step_status
  from public.internal_approval_chain_steps acs where acs.id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;

  select ac.status, ac.chain_type, r.company_id, r.title
  into v_chain_status, v_chain_type, v_company_id, v_title
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

  select chain_id, step_order, assigned_user_id into v_target_chain_id, v_target_order, v_target_assigned
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

  if v_target_assigned is not null then
    perform public.notify_user(v_company_id, v_target_assigned, 'أُعيد إليك طلب لاستكمال/توضيح', v_title, '/my-requests');
  end if;
end;
$$;
