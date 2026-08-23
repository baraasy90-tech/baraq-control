-- نسخة آمنة لإعادة تشغيل 0034_materials_procurement.sql — تُستخدم فقط إذا فشل تشغيل
-- 0034 بخطأ "already exists" (جدول/دالة/سياسة اتنشأت جزئياً من محاولة سابقة). كل
-- الأوامر هنا idempotent: تُنشئ الناقص فقط ولا تفشل لو كان الجزء موجود مسبقاً.
-- المحتوى مطابق تماماً لـ 0034، فقط بحراسة IF NOT EXISTS / DROP IF EXISTS.

create or replace function public.can_executive_approve(p_project_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.is_department_head_of_type(p_project_id, 'executive');
$$;

create table if not exists public.material_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  item_name text not null,
  description text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  status text not null default 'draft' check (status in (
    'draft',
    'sample_pending_pm_approval',
    'sample_pending_executive_approval',
    'sample_approved',
    'sample_rejected',
    'purchase_pending_pm_approval',
    'purchase_pending_finance_approval',
    'purchase_approved',
    'purchase_rejected'
  )),

  sample_price numeric,
  sample_received_at date,
  sample_submitted_by uuid references public.profiles (id) on delete set null,
  sample_submitted_at timestamptz,
  sample_pm_reviewed_by uuid references public.profiles (id) on delete set null,
  sample_pm_reviewed_at timestamptz,
  sample_pm_review_note text,
  sample_executive_reviewed_by uuid references public.profiles (id) on delete set null,
  sample_executive_reviewed_at timestamptz,
  sample_executive_review_note text,

  attachments_note text,
  quote_price numeric,
  quote_received_at date,
  purchase_submitted_by uuid references public.profiles (id) on delete set null,
  purchase_submitted_at timestamptz,
  purchase_pm_reviewed_by uuid references public.profiles (id) on delete set null,
  purchase_pm_reviewed_at timestamptz,
  purchase_pm_review_note text,
  purchase_finance_reviewed_by uuid references public.profiles (id) on delete set null,
  purchase_finance_reviewed_at timestamptz,
  purchase_finance_review_note text
);

create index if not exists material_requests_project_id_idx on public.material_requests (project_id);

alter table public.material_requests enable row level security;

drop policy if exists "scoped access material_requests" on public.material_requests;
create policy "scoped access material_requests" on public.material_requests
  for all using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

create or replace function public.submit_material_sample(p_request_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
  v_sample_price numeric;
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

  update public.material_requests
  set status = 'sample_pending_pm_approval',
      sample_submitted_by = auth.uid(), sample_submitted_at = now(),
      sample_pm_reviewed_by = null, sample_pm_reviewed_at = null, sample_pm_review_note = null,
      sample_executive_reviewed_by = null, sample_executive_reviewed_at = null, sample_executive_review_note = null
  where id = p_request_id;
end;
$$;

grant execute on function public.submit_material_sample(uuid) to authenticated;

create or replace function public.review_material_sample(p_request_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
begin
  select project_id, status into v_project_id, v_status from public.material_requests where id = p_request_id;
  if v_project_id is null then
    raise exception 'طلب المادة غير موجود';
  end if;

  if v_status = 'sample_pending_pm_approval' then
    if not public.can_pm_approve(v_project_id) then
      raise exception 'لا تملك صلاحية اعتماد العينة بهذه المرحلة (رئيس قسم إدارة المشاريع)';
    end if;
    update public.material_requests
    set status = case when p_approve then 'sample_pending_executive_approval' else 'sample_rejected' end,
        sample_pm_reviewed_by = auth.uid(), sample_pm_reviewed_at = now(), sample_pm_review_note = p_note
    where id = p_request_id;
  elsif v_status = 'sample_pending_executive_approval' then
    if not public.can_executive_approve(v_project_id) then
      raise exception 'لا تملك صلاحية اعتماد العينة النهائي (الإدارة التنفيذية)';
    end if;
    update public.material_requests
    set status = case when p_approve then 'sample_approved' else 'sample_rejected' end,
        sample_executive_reviewed_by = auth.uid(), sample_executive_reviewed_at = now(), sample_executive_review_note = p_note
    where id = p_request_id;
  else
    raise exception 'هذه العينة ليست بانتظار اعتماد حالياً';
  end if;
end;
$$;

grant execute on function public.review_material_sample(uuid, boolean, text) to authenticated;

create or replace function public.submit_material_purchase(p_request_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
  v_quote_price numeric;
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

  update public.material_requests
  set status = 'purchase_pending_pm_approval',
      purchase_submitted_by = auth.uid(), purchase_submitted_at = now(),
      purchase_pm_reviewed_by = null, purchase_pm_reviewed_at = null, purchase_pm_review_note = null,
      purchase_finance_reviewed_by = null, purchase_finance_reviewed_at = null, purchase_finance_review_note = null
  where id = p_request_id;
end;
$$;

grant execute on function public.submit_material_purchase(uuid) to authenticated;

create or replace function public.review_material_purchase(p_request_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
begin
  select project_id, status into v_project_id, v_status from public.material_requests where id = p_request_id;
  if v_project_id is null then
    raise exception 'طلب المادة غير موجود';
  end if;

  if v_status = 'purchase_pending_pm_approval' then
    if not public.can_pm_approve(v_project_id) then
      raise exception 'لا تملك صلاحية اعتماد قيمة الشراء بهذه المرحلة (رئيس قسم إدارة المشاريع)';
    end if;
    update public.material_requests
    set status = case when p_approve then 'purchase_pending_finance_approval' else 'purchase_rejected' end,
        purchase_pm_reviewed_by = auth.uid(), purchase_pm_reviewed_at = now(), purchase_pm_review_note = p_note
    where id = p_request_id;
  elsif v_status = 'purchase_pending_finance_approval' then
    if not public.can_finance_approve(v_project_id) then
      raise exception 'لا تملك صلاحية الاعتماد المالي النهائي للصرف';
    end if;
    update public.material_requests
    set status = case when p_approve then 'purchase_approved' else 'purchase_rejected' end,
        purchase_finance_reviewed_by = auth.uid(), purchase_finance_reviewed_at = now(), purchase_finance_review_note = p_note
    where id = p_request_id;
  else
    raise exception 'هذا الطلب ليس بانتظار اعتماد حالياً';
  end if;
end;
$$;

grant execute on function public.review_material_purchase(uuid, boolean, text) to authenticated;
