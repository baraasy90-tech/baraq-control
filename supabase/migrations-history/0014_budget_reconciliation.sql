-- ============================================================
-- مطابقة قيمة العقد (القسم المالي) مع الميزانية المخطط لها للمشروع
-- (مدير المشروع). الاختلاف يُحسب مباشرة من البيانات الحالية (لا يحتاج تخزيناً)،
-- ويُعرض تلقائياً لأي شخص له صلاحية على المشروع كتنبيه دائم حتى تتم معالجته.
-- هذا الجدول يحفظ فقط سجل "معالجة الخلل" (المبرر) عند إقراره من أي طرف.
-- ============================================================

create table public.budget_reconciliation_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  contract_value numeric,
  tracked_budget_value numeric,
  note text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index budget_reconciliation_notes_project_id_idx on public.budget_reconciliation_notes (project_id);

alter table public.budget_reconciliation_notes enable row level security;

create policy "scoped access budget_reconciliation_notes" on public.budget_reconciliation_notes
  for all using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));
