-- سير اعتماد مرحلتين (مدير مشاريع ثم مالية) للدفعات الفعلية بالميزانية، بنفس آلية
-- اعتماد العقود ودفعاتها (migrations 0033, 0044) — إغلاق فجوة كانت تسمح لأي عضو
-- بالمشروع بإضافة/تعديل/حذف دفعة فعلية بحرية كاملة بلا أي مراجعة.

alter table public.budget_actual_entries add column status text not null default 'approved'
  check (status in ('draft', 'pending_pm_approval', 'pending_finance_approval', 'approved', 'rejected'));
alter table public.budget_actual_entries alter column status set default 'draft';

alter table public.budget_actual_entries add column submitted_by uuid references public.profiles (id) on delete set null;
alter table public.budget_actual_entries add column submitted_at timestamptz;
alter table public.budget_actual_entries add column pm_reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.budget_actual_entries add column pm_reviewed_at timestamptz;
alter table public.budget_actual_entries add column pm_review_note text;
alter table public.budget_actual_entries add column finance_reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.budget_actual_entries add column finance_reviewed_at timestamptz;
alter table public.budget_actual_entries add column finance_review_note text;

-- حراسة أعمدة سير الاعتماد (نفس دالة guard_protected_columns العامة من migration 0044)
create trigger guard_budget_entries_workflow
before update on public.budget_actual_entries
for each row execute function public.guard_protected_columns(
  'status', 'submitted_by', 'submitted_at',
  'pm_reviewed_by', 'pm_reviewed_at', 'pm_review_note',
  'finance_reviewed_by', 'finance_reviewed_at', 'finance_review_note'
);

-- تجميد تفاصيل الدفعة المالية بعد الرفع للاعتماد
create or replace function public.guard_budget_entry_value_freeze()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if current_setting('app.bypass_workflow_guard', true) = 'on' then
    return new;
  end if;
  if old.status <> 'draft' and (
       new.amount is distinct from old.amount
    or new.date is distinct from old.date
    or new.activity_id is distinct from old.activity_id
    or new.source is distinct from old.source
    or new.contract_ref is distinct from old.contract_ref
    or new.contract_payment_id is distinct from old.contract_payment_id
  ) then
    raise exception 'لا يمكن تعديل تفاصيل الدفعة الفعلية بعد رفعها للاعتماد؛ أعدها للمسودة أولاً';
  end if;
  return new;
end;
$$;

create trigger guard_budget_entries_value
before update on public.budget_actual_entries
for each row execute function public.guard_budget_entry_value_freeze();

-- RLS: فصل الحذف (مسموح فقط بحالة draft) عن باقي العمليات
drop policy if exists "scoped access budget_actual_entries" on public.budget_actual_entries;

create policy "select budget_actual_entries" on public.budget_actual_entries
  for select using (activity_id in (select a.id from public.activities a where public.can_access_project(a.project_id)));

create policy "insert budget_actual_entries" on public.budget_actual_entries
  for insert with check (activity_id in (select a.id from public.activities a where public.can_access_project(a.project_id)));

create policy "update budget_actual_entries" on public.budget_actual_entries
  for update using (activity_id in (select a.id from public.activities a where public.can_access_project(a.project_id)))
  with check (activity_id in (select a.id from public.activities a where public.can_access_project(a.project_id)));

create policy "delete draft budget_actual_entries" on public.budget_actual_entries
  for delete using (
    status = 'draft'
    and activity_id in (select a.id from public.activities a where public.can_access_project(a.project_id))
  );

-- RPCs: تقديم/اعتماد/إعادة للمسودة (نفس بنية submit_contract_payment / review_contract_payment / reset_contract_to_draft)
create or replace function public.submit_budget_entry(p_entry_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
  v_amount numeric;
begin
  select a.project_id, e.status, e.amount into v_project_id, v_status, v_amount
  from public.budget_actual_entries e
  join public.activities a on a.id = e.activity_id
  where e.id = p_entry_id;

  if v_project_id is null then
    raise exception 'الدفعة غير موجودة';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا المشروع';
  end if;
  if v_status <> 'draft' then
    raise exception 'هذه الدفعة ليست في مرحلة مسودة';
  end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'لازم مبلغ صحيح للدفعة أولاً';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);
  update public.budget_actual_entries
  set status = 'pending_pm_approval', submitted_by = auth.uid(), submitted_at = now()
  where id = p_entry_id;
end;
$$;

grant execute on function public.submit_budget_entry(uuid) to authenticated;

create or replace function public.review_budget_entry(p_entry_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
begin
  select a.project_id, e.status into v_project_id, v_status
  from public.budget_actual_entries e
  join public.activities a on a.id = e.activity_id
  where e.id = p_entry_id;

  if v_project_id is null then
    raise exception 'الدفعة غير موجودة';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);

  if v_status = 'pending_pm_approval' then
    if not public.can_pm_approve(v_project_id) then
      raise exception 'لا تملك صلاحية اعتماد الدفعات الفعلية بهذه المرحلة (رئيس قسم إدارة المشاريع)';
    end if;
    update public.budget_actual_entries
    set status = case when p_approve then 'pending_finance_approval' else 'rejected' end,
        pm_reviewed_by = auth.uid(), pm_reviewed_at = now(), pm_review_note = p_note
    where id = p_entry_id;
  elsif v_status = 'pending_finance_approval' then
    if not public.can_finance_approve(v_project_id) then
      raise exception 'لا تملك صلاحية الاعتماد المالي النهائي';
    end if;
    update public.budget_actual_entries
    set status = case when p_approve then 'approved' else 'rejected' end,
        finance_reviewed_by = auth.uid(), finance_reviewed_at = now(), finance_review_note = p_note
    where id = p_entry_id;
  else
    raise exception 'هذه الدفعة ليست بانتظار اعتماد حالياً';
  end if;
end;
$$;

grant execute on function public.review_budget_entry(uuid, boolean, text) to authenticated;

create or replace function public.reset_budget_entry_to_draft(p_entry_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
begin
  select a.project_id, e.status into v_project_id, v_status
  from public.budget_actual_entries e
  join public.activities a on a.id = e.activity_id
  where e.id = p_entry_id;

  if v_project_id is null then
    raise exception 'الدفعة غير موجودة';
  end if;
  if not public.can_pm_approve(v_project_id) then
    raise exception 'لا تملك صلاحية إعادة هذه الدفعة للمسودة';
  end if;
  if v_status not in ('approved', 'rejected', 'pending_pm_approval', 'pending_finance_approval') then
    raise exception 'هذه الدفعة بمسودة بالفعل';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);
  update public.budget_actual_entries
  set status = 'draft',
      submitted_by = null, submitted_at = null,
      pm_reviewed_by = null, pm_reviewed_at = null, pm_review_note = null,
      finance_reviewed_by = null, finance_reviewed_at = null, finance_review_note = null
  where id = p_entry_id;
end;
$$;

grant execute on function public.reset_budget_entry_to_draft(uuid) to authenticated;

notify pgrst, 'reload schema';
