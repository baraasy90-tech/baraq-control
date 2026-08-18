-- تصحيح آلية الاعتماد لتكون مرحلتين متسلسلتين بدل مرحلة واحدة، بناءً على توضيح المستخدم:
-- مدير المشروع يرفع الطلب ← رئيس قسم إدارة المشاريع يعتمد ← يُحوَّل تلقائياً للمدير المالي
-- (رئيس قسم الإدارة المالية) للاعتماد النهائي ← بعدها فقط يُطبَّق التعديل فعلياً.
-- ينطبق على العقود والدفعات (وأي "أعمال إضافية" لاحقاً)، وليس على تنبيه اختلاف الميزانية
-- العام (يبقى بنفس آليته الحالية الأبسط).

create or replace function public.is_department_head_of_type(p_project_id uuid, p_dept_type text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    public.can_manage_org((select company_id from public.projects where id = p_project_id))
    or exists (
      select 1
      from public.department_members dm
      join public.departments d on d.id = dm.department_id
      where dm.user_id = auth.uid()
        and dm.role = 'head'
        and d.type = p_dept_type
        and d.company_id = (select company_id from public.projects where id = p_project_id)
    );
$$;

create or replace function public.can_pm_approve(p_project_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.is_department_head_of_type(p_project_id, 'project_management');
$$;

create or replace function public.can_finance_approve(p_project_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.is_department_head_of_type(p_project_id, 'finance');
$$;

-- ===== العقود =====
alter table public.contracts drop constraint contracts_status_check;
alter table public.contracts add constraint contracts_status_check
  check (status in ('draft', 'pending_pm_approval', 'pending_finance_approval', 'approved', 'rejected'));
update public.contracts set status = 'pending_pm_approval' where status = 'pending_approval';

alter table public.contracts drop column reviewed_by;
alter table public.contracts drop column reviewed_at;
alter table public.contracts drop column review_note;
alter table public.contracts add column pm_reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.contracts add column pm_reviewed_at timestamptz;
alter table public.contracts add column pm_review_note text;
alter table public.contracts add column finance_reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.contracts add column finance_reviewed_at timestamptz;
alter table public.contracts add column finance_review_note text;

create or replace function public.review_contract(p_contract_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
begin
  select project_id, status into v_project_id, v_status from public.contracts where id = p_contract_id;
  if v_project_id is null then
    raise exception 'العقد غير موجود';
  end if;

  if v_status = 'pending_pm_approval' then
    if not public.can_pm_approve(v_project_id) then
      raise exception 'لا تملك صلاحية اعتماد العقود بهذه المرحلة (رئيس قسم إدارة المشاريع)';
    end if;
    update public.contracts
    set status = case when p_approve then 'pending_finance_approval' else 'rejected' end,
        pm_reviewed_by = auth.uid(), pm_reviewed_at = now(), pm_review_note = p_note
    where id = p_contract_id;
  elsif v_status = 'pending_finance_approval' then
    if not public.can_finance_approve(v_project_id) then
      raise exception 'لا تملك صلاحية الاعتماد المالي النهائي';
    end if;
    update public.contracts
    set status = case when p_approve then 'approved' else 'rejected' end,
        finance_reviewed_by = auth.uid(), finance_reviewed_at = now(), finance_review_note = p_note
    where id = p_contract_id;
  else
    raise exception 'هذا العقد ليس بانتظار اعتماد حالياً';
  end if;
end;
$$;

-- ===== الدفعات/المستخلصات =====
alter table public.contract_payments drop constraint contract_payments_status_check;
alter table public.contract_payments add constraint contract_payments_status_check
  check (status in ('pending', 'pending_pm_approval', 'pending_finance_approval', 'approved', 'rejected'));
update public.contract_payments set status = 'pending_pm_approval' where status = 'submitted';

alter table public.contract_payments drop column reviewed_by;
alter table public.contract_payments drop column reviewed_at;
alter table public.contract_payments drop column review_note;
alter table public.contract_payments add column pm_reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.contract_payments add column pm_reviewed_at timestamptz;
alter table public.contract_payments add column pm_review_note text;
alter table public.contract_payments add column finance_reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.contract_payments add column finance_reviewed_at timestamptz;
alter table public.contract_payments add column finance_review_note text;

create or replace function public.review_contract_payment(p_payment_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
begin
  select p.project_id, cp.status into v_project_id, v_status
  from public.contract_payments cp
  join public.contracts c on c.id = cp.contract_id
  join public.projects p on p.id = c.project_id
  where cp.id = p_payment_id;

  if v_project_id is null then
    raise exception 'الدفعة غير موجودة';
  end if;

  if v_status = 'pending_pm_approval' then
    if not public.can_pm_approve(v_project_id) then
      raise exception 'لا تملك صلاحية اعتماد الدفعات بهذه المرحلة (رئيس قسم إدارة المشاريع)';
    end if;
    update public.contract_payments
    set status = case when p_approve then 'pending_finance_approval' else 'rejected' end,
        pm_reviewed_by = auth.uid(), pm_reviewed_at = now(), pm_review_note = p_note
    where id = p_payment_id;
  elsif v_status = 'pending_finance_approval' then
    if not public.can_finance_approve(v_project_id) then
      raise exception 'لا تملك صلاحية الاعتماد المالي النهائي';
    end if;
    update public.contract_payments
    set status = case when p_approve then 'approved' else 'rejected' end,
        finance_reviewed_by = auth.uid(), finance_reviewed_at = now(), finance_review_note = p_note
    where id = p_payment_id;
  else
    raise exception 'هذه الدفعة ليست بانتظار اعتماد حالياً';
  end if;
end;
$$;
