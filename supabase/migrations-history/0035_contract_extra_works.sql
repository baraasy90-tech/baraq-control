-- "الأعمال الإضافية" لكل عقد: بند إضافي يمر بنفس تسلسل اعتماد العقود/الدفعات
-- (مدير المشروع يرفع الطلب ← رئيس قسم إدارة المشاريع ← المدير المالي للاعتماد
-- النهائي)، بنفس نمط 0031-0034. لا تُعدَّل قيمة العقد الأصلية (contracts.total_value)
-- تلقائياً؛ الواجهة تعرض "القيمة الإجمالية بعد الإضافات" كمجموع محسوب (القيمة
-- الأصلية + الأعمال الإضافية المعتمدة فقط) حتى يبقى السجل الأصلي للعقد مرجعاً ثابتاً.

create table public.contract_extra_works (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  title text not null,
  description text,
  amount numeric not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  status text not null default 'draft' check (status in (
    'draft', 'pending_pm_approval', 'pending_finance_approval', 'approved', 'rejected'
  )),
  submitted_by uuid references public.profiles (id) on delete set null,
  submitted_at timestamptz,
  pm_reviewed_by uuid references public.profiles (id) on delete set null,
  pm_reviewed_at timestamptz,
  pm_review_note text,
  finance_reviewed_by uuid references public.profiles (id) on delete set null,
  finance_reviewed_at timestamptz,
  finance_review_note text
);

create index contract_extra_works_contract_id_idx on public.contract_extra_works (contract_id);

alter table public.contract_extra_works enable row level security;

create policy "scoped access contract_extra_works" on public.contract_extra_works
  for all using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_id and public.can_access_project(c.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.contracts c
      where c.id = contract_id and public.can_access_project(c.project_id)
    )
  );

create or replace function public.submit_contract_extra_work(p_extra_work_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
  v_amount numeric;
begin
  select p.id, ew.status, ew.amount into v_project_id, v_status, v_amount
  from public.contract_extra_works ew
  join public.contracts c on c.id = ew.contract_id
  join public.projects p on p.id = c.project_id
  where ew.id = p_extra_work_id;

  if v_project_id is null then
    raise exception 'البند غير موجود';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا المشروع';
  end if;
  if v_status not in ('draft', 'rejected') then
    raise exception 'هذا البند ليس في مرحلة تسمح بالتقديم للاعتماد';
  end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'لازم إدخال قيمة صحيحة للبند أولاً';
  end if;

  update public.contract_extra_works
  set status = 'pending_pm_approval',
      submitted_by = auth.uid(), submitted_at = now(),
      pm_reviewed_by = null, pm_reviewed_at = null, pm_review_note = null,
      finance_reviewed_by = null, finance_reviewed_at = null, finance_review_note = null
  where id = p_extra_work_id;
end;
$$;

grant execute on function public.submit_contract_extra_work(uuid) to authenticated;

create or replace function public.review_contract_extra_work(p_extra_work_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
begin
  select p.id, ew.status into v_project_id, v_status
  from public.contract_extra_works ew
  join public.contracts c on c.id = ew.contract_id
  join public.projects p on p.id = c.project_id
  where ew.id = p_extra_work_id;

  if v_project_id is null then
    raise exception 'البند غير موجود';
  end if;

  if v_status = 'pending_pm_approval' then
    if not public.can_pm_approve(v_project_id) then
      raise exception 'لا تملك صلاحية اعتماد الأعمال الإضافية بهذه المرحلة (رئيس قسم إدارة المشاريع)';
    end if;
    update public.contract_extra_works
    set status = case when p_approve then 'pending_finance_approval' else 'rejected' end,
        pm_reviewed_by = auth.uid(), pm_reviewed_at = now(), pm_review_note = p_note
    where id = p_extra_work_id;
  elsif v_status = 'pending_finance_approval' then
    if not public.can_finance_approve(v_project_id) then
      raise exception 'لا تملك صلاحية الاعتماد المالي النهائي';
    end if;
    update public.contract_extra_works
    set status = case when p_approve then 'approved' else 'rejected' end,
        finance_reviewed_by = auth.uid(), finance_reviewed_at = now(), finance_review_note = p_note
    where id = p_extra_work_id;
  else
    raise exception 'هذا البند ليس بانتظار اعتماد حالياً';
  end if;
end;
$$;

grant execute on function public.review_contract_extra_work(uuid, boolean, text) to authenticated;
