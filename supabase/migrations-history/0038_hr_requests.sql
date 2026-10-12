-- طلبات داخلية عامة: أي مستخدم يرسل طلباً لأي قسم (مالية، إدارة عليا، مشتريات،
-- موارد بشرية...) مع تحديد شخص اختياري ومرفق. من يملك صلاحية الرد: الشخص المحدد
-- تحديداً (إن وُجد)، أو أي رئيس قسم للقسم المستهدف، أو مدير الحساب/الإدارة التنفيذية.
--
-- ملاحظة تاريخية: النسخة الأولى من هذه الميزة كانت مقصورة على الموارد البشرية فقط
-- (باسم hr_requests)، وتم تعميمها لاحقاً (migration 0042 سابقاً) إلى أي قسم — هذا
-- الملف يدمج الاثنين معاً لأن جدول hr_requests الأصلي لم يُطبَّق فعلياً قبل التعميم.

create table public.internal_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  department_id uuid references public.departments (id) on delete set null,
  target_user_id uuid references public.profiles (id) on delete set null,
  type text check (type in ('leave', 'contract_renewal', 'other')),
  title text not null,
  description text,
  start_date date,
  end_date date,
  attachment_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create index internal_requests_company_id_idx on public.internal_requests (company_id);
create index internal_requests_user_id_idx on public.internal_requests (user_id);

alter table public.internal_requests enable row level security;

create policy "user inserts own internal_requests" on public.internal_requests
  for insert with check (user_id = auth.uid());

create policy "user reads own internal_requests" on public.internal_requests
  for select using (user_id = auth.uid());

create or replace function public.can_review_request(p_request_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_company_id uuid;
  v_department_id uuid;
  v_target_user_id uuid;
begin
  select company_id, department_id, target_user_id into v_company_id, v_department_id, v_target_user_id
  from public.internal_requests where id = p_request_id;

  if v_company_id is null then
    return false;
  end if;

  if public.can_manage_org(v_company_id) then
    return true;
  end if;

  if v_target_user_id is not null and v_target_user_id = auth.uid() then
    return true;
  end if;

  if v_department_id is not null and exists (
    select 1 from public.department_members dm
    where dm.department_id = v_department_id and dm.user_id = auth.uid() and dm.role = 'head'
  ) then
    return true;
  end if;

  return false;
end;
$$;

create policy "reviewers read internal_requests" on public.internal_requests
  for select using (public.can_review_request(id));

create or replace function public.review_internal_request(p_request_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from public.internal_requests where id = p_request_id;
  if v_status is null then
    raise exception 'الطلب غير موجود';
  end if;
  if not public.can_review_request(p_request_id) then
    raise exception 'لا تملك صلاحية الرد على هذا الطلب';
  end if;
  if v_status <> 'pending' then
    raise exception 'هذا الطلب ليس بانتظار رد حالياً';
  end if;

  update public.internal_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note
  where id = p_request_id;
end;
$$;

grant execute on function public.review_internal_request(uuid, boolean, text) to authenticated;
