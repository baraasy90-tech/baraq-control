-- تحويل اعتماد المواد والمشتريات من مراحل ثابتة (رئيس قسم إدارة المشاريع ← تنفيذية/مالية)
-- إلى سلسلة اعتماد ديناميكية يبنيها رافع الطلب بنفسه لكل طلب على حدة:
--
--   * رافع الطلب يحدد قائمة مرتّبة من "الجهات" المطلوب اعتمادها (قسم، أو شخص محدد إن عرفه).
--   * الاعتماد يتم بالتسلسل الصارم: كل مرحلة تنتظر اعتماد اللي قبلها.
--   * لو تحدد "قسم" بدون شخص، رئيس ذاك القسم يحوّل المرحلة لشخص مسؤول محدد — التحويل نفسه
--     توجيه فقط ولا يُحسب كموافقة؛ الموافقة الفعلية تصير من الشخص المعيّن فقط.
--   * أي شخص وصل الدور له فعلاً يقدر يضيف معتمداً إضافياً قبل مرحلته هو (تفويض/تصعيد حسب
--     سياسة الشركة)، فتُحقن مرحلة جديدة قبله مباشرة.
--   * أي رفض بأي مرحلة يوقف السلسلة كاملة فوراً برفض الطلب (مع توضيح السبب)، ويرجع لرافع
--     الطلب ليرفق تبريراً ويعيد تقديم سلسلة جديدة (نفس الطلب) أو يرفع طلباً جديداً بالكامل.
--
-- الجدول material_requests وبياناته (السعر، الوصف...) من 0034/0042 يبقى كما هو؛ فقط أعمدة
-- المراجعة الثابتة (pm/executive/finance) تُستبدل بجدولي approval_chains/approval_chain_steps
-- العامّين، وكذلك الدوال الأربع القديمة (submit/review لكل مرحلة) تُستبدل بخمس دوال جديدة.

drop function if exists public.submit_material_sample(uuid);
drop function if exists public.review_material_sample(uuid, boolean, text);
drop function if exists public.submit_material_purchase(uuid);
drop function if exists public.review_material_purchase(uuid, boolean, text);

alter table public.material_requests drop constraint material_requests_status_check;
alter table public.material_requests add constraint material_requests_status_check
  check (status in (
    'draft',
    'sample_pending',
    'sample_approved',
    'sample_rejected',
    'purchase_pending',
    'purchase_approved',
    'purchase_rejected'
  ));
update public.material_requests set status = 'sample_pending' where status in ('sample_pending_pm_approval', 'sample_pending_executive_approval');
update public.material_requests set status = 'purchase_pending' where status in ('purchase_pending_pm_approval', 'purchase_pending_finance_approval');

alter table public.material_requests drop column sample_submitted_by;
alter table public.material_requests drop column sample_submitted_at;
alter table public.material_requests drop column sample_pm_reviewed_by;
alter table public.material_requests drop column sample_pm_reviewed_at;
alter table public.material_requests drop column sample_pm_review_note;
alter table public.material_requests drop column sample_executive_reviewed_by;
alter table public.material_requests drop column sample_executive_reviewed_at;
alter table public.material_requests drop column sample_executive_review_note;
alter table public.material_requests drop column purchase_submitted_by;
alter table public.material_requests drop column purchase_submitted_at;
alter table public.material_requests drop column purchase_pm_reviewed_by;
alter table public.material_requests drop column purchase_pm_reviewed_at;
alter table public.material_requests drop column purchase_pm_review_note;
alter table public.material_requests drop column purchase_finance_reviewed_by;
alter table public.material_requests drop column purchase_finance_reviewed_at;
alter table public.material_requests drop column purchase_finance_review_note;

-- رئيس قسم محدد بذاته (بغض النظر عن نوعه) — يُستخدم للتحويل، بخلاف is_department_head_of_type
-- المبني على نوع القسم الثابت (project_management/finance) والمستخدم بالعقود/الدفعات.
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

create table public.approval_chains (
  id uuid primary key default gen_random_uuid(),
  material_request_id uuid not null references public.material_requests (id) on delete cascade,
  phase text not null check (phase in ('sample', 'purchase')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  requester_note text
);

create index approval_chains_material_request_id_idx on public.approval_chains (material_request_id);

create table public.approval_chain_steps (
  id uuid primary key default gen_random_uuid(),
  chain_id uuid not null references public.approval_chains (id) on delete cascade,
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

create index approval_chain_steps_chain_id_idx on public.approval_chain_steps (chain_id);

alter table public.approval_chains enable row level security;
alter table public.approval_chain_steps enable row level security;

create policy "scoped read approval_chains" on public.approval_chains
  for select using (
    material_request_id in (select mr.id from public.material_requests mr where public.can_access_project(mr.project_id))
  );

create policy "scoped read approval_chain_steps" on public.approval_chain_steps
  for select using (
    chain_id in (
      select ac.id from public.approval_chains ac
      join public.material_requests mr on mr.id = ac.material_request_id
      where public.can_access_project(mr.project_id)
    )
  );

-- ===== تقديم سلسلة اعتماد جديدة (عينة أو شراء رسمي) =====
create or replace function public.submit_material_sample_chain(p_request_id uuid, p_steps jsonb, p_note text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
  v_sample_price numeric;
  v_chain_id uuid;
  v_step jsonb;
  v_order integer := 0;
begin
  select project_id, status, sample_price into v_project_id, v_status, v_sample_price
  from public.material_requests where id = p_request_id;

  if v_project_id is null then
    raise exception 'طلب المادة غير موجود';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا المشروع';
  end if;
  if v_status not in ('draft', 'sample_rejected') then
    raise exception 'هذا الطلب ليس في مرحلة تسمح بتقديم العينة للاعتماد';
  end if;
  if v_sample_price is null then
    raise exception 'لازم إدخال سعر العينة أولاً';
  end if;
  if p_steps is null or jsonb_array_length(p_steps) = 0 then
    raise exception 'لازم تحديد جهة اعتماد واحدة على الأقل';
  end if;

  insert into public.approval_chains (material_request_id, phase, created_by, requester_note)
  values (p_request_id, 'sample', auth.uid(), p_note)
  returning id into v_chain_id;

  for v_step in select * from jsonb_array_elements(p_steps) loop
    v_order := v_order + 1;
    insert into public.approval_chain_steps (chain_id, step_order, department_id, assigned_user_id)
    values (v_chain_id, v_order, nullif(v_step->>'department_id', '')::uuid, nullif(v_step->>'user_id', '')::uuid);
  end loop;

  update public.material_requests set status = 'sample_pending' where id = p_request_id;

  return v_chain_id;
end;
$$;

grant execute on function public.submit_material_sample_chain(uuid, jsonb, text) to authenticated;

create or replace function public.submit_material_purchase_chain(p_request_id uuid, p_steps jsonb, p_note text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
  v_quote_price numeric;
  v_chain_id uuid;
  v_step jsonb;
  v_order integer := 0;
begin
  select project_id, status, quote_price into v_project_id, v_status, v_quote_price
  from public.material_requests where id = p_request_id;

  if v_project_id is null then
    raise exception 'طلب المادة غير موجود';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا المشروع';
  end if;
  if v_status not in ('sample_approved', 'purchase_rejected') then
    raise exception 'يلزم اعتماد العينة أولاً قبل تقديم طلب الشراء الرسمي';
  end if;
  if v_quote_price is null then
    raise exception 'لازم إدخال سعر عرض السعر أولاً';
  end if;
  if p_steps is null or jsonb_array_length(p_steps) = 0 then
    raise exception 'لازم تحديد جهة اعتماد واحدة على الأقل';
  end if;

  insert into public.approval_chains (material_request_id, phase, created_by, requester_note)
  values (p_request_id, 'purchase', auth.uid(), p_note)
  returning id into v_chain_id;

  for v_step in select * from jsonb_array_elements(p_steps) loop
    v_order := v_order + 1;
    insert into public.approval_chain_steps (chain_id, step_order, department_id, assigned_user_id)
    values (v_chain_id, v_order, nullif(v_step->>'department_id', '')::uuid, nullif(v_step->>'user_id', '')::uuid);
  end loop;

  update public.material_requests set status = 'purchase_pending' where id = p_request_id;

  return v_chain_id;
end;
$$;

grant execute on function public.submit_material_purchase_chain(uuid, jsonb, text) to authenticated;

-- ===== توجيه مرحلة "قسم" لشخص مسؤول محدد (رئيس القسم فقط) — توجيه لا يُحسب موافقة =====
create or replace function public.route_approval_step(p_step_id uuid, p_user_id uuid)
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
  from public.approval_chain_steps where id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;
  select status into v_chain_status from public.approval_chains where id = v_chain_id;
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
    select 1 from public.approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> 'approved'
  ) then
    raise exception 'لم يصل الدور لهذه المرحلة بعد';
  end if;
  if not public.is_department_head(v_department_id) then
    raise exception 'لا تملك صلاحية توجيه طلبات هذا القسم (رئيس القسم فقط)';
  end if;

  update public.approval_chain_steps
  set assigned_user_id = p_user_id, routed_by = auth.uid(), routed_at = now()
  where id = p_step_id;
end;
$$;

grant execute on function public.route_approval_step(uuid, uuid) to authenticated;

-- ===== إضافة معتمد إضافي قبل مرحلة نشطة — فقط من الشخص الوصل له الدور فعلاً =====
create or replace function public.insert_approval_step(p_step_id uuid, p_department_id uuid, p_user_id uuid, p_note text)
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
  from public.approval_chain_steps acs where acs.id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;
  select ac.status, p.company_id into v_chain_status, v_company_id
  from public.approval_chains ac
  join public.material_requests mr on mr.id = ac.material_request_id
  join public.projects p on p.id = mr.project_id
  where ac.id = v_chain_id;

  if v_chain_status <> 'pending' then
    raise exception 'سلسلة الاعتماد هذه غير نشطة حالياً';
  end if;
  if v_step_status <> 'pending' then
    raise exception 'هذه المرحلة ليست بانتظار إجراء';
  end if;
  if exists (
    select 1 from public.approval_chain_steps
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

  update public.approval_chain_steps
  set step_order = step_order + 1
  where chain_id = v_chain_id and step_order >= v_step_order;

  insert into public.approval_chain_steps (chain_id, step_order, department_id, assigned_user_id, inserted_by, note)
  values (v_chain_id, v_step_order, p_department_id, p_user_id, auth.uid(), p_note);
end;
$$;

grant execute on function public.insert_approval_step(uuid, uuid, uuid, text) to authenticated;

-- ===== اعتماد/رفض مرحلة نشطة — فقط الشخص المعيّن لها فعلياً =====
create or replace function public.review_approval_step(p_step_id uuid, p_approve boolean, p_note text)
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
  v_phase text;
  v_material_request_id uuid;
  v_company_id uuid;
  v_max_order integer;
begin
  select acs.chain_id, acs.step_order, acs.assigned_user_id, acs.status
  into v_chain_id, v_step_order, v_assigned_user_id, v_step_status
  from public.approval_chain_steps acs where acs.id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;

  select ac.status, ac.phase, ac.material_request_id, p.company_id
  into v_chain_status, v_phase, v_material_request_id, v_company_id
  from public.approval_chains ac
  join public.material_requests mr on mr.id = ac.material_request_id
  join public.projects p on p.id = mr.project_id
  where ac.id = v_chain_id;

  if v_chain_status <> 'pending' then
    raise exception 'سلسلة الاعتماد هذه غير نشطة حالياً';
  end if;
  if v_step_status <> 'pending' then
    raise exception 'هذه المرحلة ليست بانتظار إجراء';
  end if;
  if exists (
    select 1 from public.approval_chain_steps
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

  update public.approval_chain_steps
  set status = case when p_approve then 'approved' else 'rejected' end,
      acted_by = auth.uid(), acted_at = now(), note = p_note
  where id = p_step_id;

  if not p_approve then
    update public.approval_chain_steps set status = 'skipped' where chain_id = v_chain_id and status = 'pending';
    update public.approval_chains set status = 'rejected', decided_at = now() where id = v_chain_id;
    update public.material_requests
    set status = case when v_phase = 'sample' then 'sample_rejected' else 'purchase_rejected' end
    where id = v_material_request_id;
  else
    select max(step_order) into v_max_order from public.approval_chain_steps where chain_id = v_chain_id;
    if v_step_order = v_max_order then
      update public.approval_chains set status = 'approved', decided_at = now() where id = v_chain_id;
      update public.material_requests
      set status = case when v_phase = 'sample' then 'sample_approved' else 'purchase_approved' end
      where id = v_material_request_id;
    end if;
  end if;
end;
$$;

grant execute on function public.review_approval_step(uuid, boolean, text) to authenticated;
