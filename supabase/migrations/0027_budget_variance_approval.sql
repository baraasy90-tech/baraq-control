-- آلية اعتماد لمعالجة اختلاف الميزانية/العقد: بعد إرفاق المبرر، يتحول البند لـ"بانتظار
-- الاعتماد" بدل الاكتفاء بتسجيله فقط — يعتمده أو يرفضه مدير الحساب/الإدارة التنفيذية أو
-- أي عضو بقسم "الإدارة المالية".

alter table public.budget_reconciliation_notes
  add column status text not null default 'pending' check (status in ('pending', 'approved', 'rejected'));
alter table public.budget_reconciliation_notes add column reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.budget_reconciliation_notes add column reviewed_at timestamptz;
alter table public.budget_reconciliation_notes add column review_note text;

create or replace function public.can_approve_budget_variance(p_project_id uuid)
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
        and d.type = 'finance'
        and d.company_id = (select company_id from public.projects where id = p_project_id)
    );
$$;

drop policy if exists "scoped access budget_reconciliation_notes" on public.budget_reconciliation_notes;

create policy "project members read notes" on public.budget_reconciliation_notes
  for select using (public.can_access_project(project_id));

create policy "project members insert notes" on public.budget_reconciliation_notes
  for insert with check (public.can_access_project(project_id));

create policy "approvers update notes" on public.budget_reconciliation_notes
  for update using (public.can_approve_budget_variance(project_id));
