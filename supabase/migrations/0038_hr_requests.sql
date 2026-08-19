-- طلبات الموارد البشرية: شخصية لكل مستخدم (بغض النظر عن دوره — مدير مشروع، محاسب،
-- مدير مشاريع، أو مدير عام)، وليست مرتبطة بأي مشروع. كل مستخدم يقدّم طلبه (إجازة/
-- تجديد عقد/أمر آخر) ويتابع حالته، ورئيس قسم الموارد البشرية (أو مدير الحساب/الإدارة
-- التنفيذية) يعتمد أو يرفض عبر دالة security definer بدل سياسة تحديث عامة، حتى لا
-- يستطيع المستخدم اعتماد طلب نفسه.

create or replace function public.can_hr_approve_company(p_company_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    public.can_manage_org(p_company_id)
    or exists (
      select 1 from public.department_members dm
      join public.departments d on d.id = dm.department_id
      where dm.user_id = auth.uid() and dm.role = 'head' and d.type = 'hr' and d.company_id = p_company_id
    );
$$;

create table public.hr_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('leave', 'contract_renewal', 'other')),
  title text not null,
  description text,
  start_date date,
  end_date date,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create index hr_requests_company_id_idx on public.hr_requests (company_id);
create index hr_requests_user_id_idx on public.hr_requests (user_id);

alter table public.hr_requests enable row level security;

create policy "user inserts own hr_requests" on public.hr_requests
  for insert with check (user_id = auth.uid());

create policy "user reads own hr_requests" on public.hr_requests
  for select using (user_id = auth.uid());

create policy "hr reads company hr_requests" on public.hr_requests
  for select using (public.can_hr_approve_company(company_id));

create or replace function public.review_hr_request(p_request_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
  v_status text;
begin
  select company_id, status into v_company_id, v_status from public.hr_requests where id = p_request_id;
  if v_company_id is null then
    raise exception 'الطلب غير موجود';
  end if;
  if not public.can_hr_approve_company(v_company_id) then
    raise exception 'لا تملك صلاحية اعتماد طلبات الموارد البشرية';
  end if;
  if v_status <> 'pending' then
    raise exception 'هذا الطلب ليس بانتظار اعتماد حالياً';
  end if;

  update public.hr_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note
  where id = p_request_id;
end;
$$;

grant execute on function public.review_hr_request(uuid, boolean, text) to authenticated;
