-- ============================================================
-- نظام المهام العام — مهمة مستقلة عن جدول المراحل، قابلة للإسناد لأي عضو
-- بالفريق، تظهر بقائمة موحّدة عبر كل المشاريع (زي "مهامي" بمنصات مشابهة)
-- ============================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_assigned_to_idx on public.tasks (assigned_to);

alter table public.tasks enable row level security;

create policy "company members access tasks" on public.tasks
  for all using (
    project_id in (select id from public.projects where company_id = public.current_company_id())
  )
  with check (
    project_id in (select id from public.projects where company_id = public.current_company_id())
  );
