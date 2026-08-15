-- ============================================================
-- تسلسل صلاحيات كامل: مالك الشركة → الإدارة التنفيذية → رئيس القسم →
-- مدير المشروع → عضو الفريق. كل مستوى يشوف بس بيانات نطاقه، بدون رؤية
-- للأعلى بالشجرة. يعتمد على جدول جديد project_members (تخصيص أشخاص
-- لمشاريع محددة) + دالة صلاحيات موحّدة تُستخدم بكل الجداول.
-- ============================================================

-- ---------- عضوية المشروع ----------
-- role: 'manager' مدير المشروع، 'member' عضو فريق عادي بهذا المشروع تحديداً
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('manager', 'member')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index project_members_project_id_idx on public.project_members (project_id);
create index project_members_user_id_idx on public.project_members (user_id);

-- ============================================================
-- دوال الوصول للمشروع (تُستخدم بكل الجداول المرتبطة بالمشروع)
-- ============================================================

-- تقدر تشوف بيانات المشروع؟ (مالك الشركة، أو تنفيذي، أو رئيس قسم المشروع، أو مُعيَّن على المشروع نفسه)
create or replace function public.can_access_project(p_project_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
    and (
      public.is_company_owner(p.company_id)
      or public.is_executive(p.company_id)
      or exists (
        select 1 from public.department_members dm
        where dm.department_id = p.department_id and dm.user_id = auth.uid() and dm.role = 'head'
      )
      or exists (
        select 1 from public.project_members pm
        where pm.project_id = p.id and pm.user_id = auth.uid()
      )
    )
  );
$$;

-- تقدر تدير المشروع (تعيين/إزالة أعضاء)؟ نفس السابق لكن بدل "أي عضو" لازم تكون "مدير المشروع" تحديداً
create or replace function public.can_manage_project(p_project_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
    and (
      public.is_company_owner(p.company_id)
      or public.is_executive(p.company_id)
      or exists (
        select 1 from public.department_members dm
        where dm.department_id = p.department_id and dm.user_id = auth.uid() and dm.role = 'head'
      )
      or exists (
        select 1 from public.project_members pm
        where pm.project_id = p.id and pm.user_id = auth.uid() and pm.role = 'manager'
      )
    )
  );
$$;

alter table public.project_members enable row level security;

create policy "project accessors read project_members" on public.project_members
  for select using (public.can_access_project(project_id));
create policy "project managers write project_members" on public.project_members
  for all using (public.can_manage_project(project_id))
  with check (public.can_manage_project(project_id));

-- ============================================================
-- إعادة كتابة سياسات الوصول لكل جدول مرتبط بمشروع: من "أي عضو بالشركة"
-- إلى "من له صلاحية وصول لهذا المشروع تحديداً" (can_access_project)
-- ============================================================

drop policy if exists "company members access projects" on public.projects;
create policy "scoped access projects" on public.projects
  for all using (public.can_access_project(id))
  with check (public.can_access_project(id));

drop policy if exists "company members access activities" on public.activities;
create policy "scoped access activities" on public.activities
  for all using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

drop policy if exists "company members access checklist_items" on public.checklist_items;
create policy "scoped access checklist_items" on public.checklist_items
  for all using (
    activity_id in (select a.id from public.activities a where public.can_access_project(a.project_id))
  )
  with check (
    activity_id in (select a.id from public.activities a where public.can_access_project(a.project_id))
  );

drop policy if exists "company members access submissions" on public.submissions;
create policy "scoped access submissions" on public.submissions
  for all using (
    activity_id in (select a.id from public.activities a where public.can_access_project(a.project_id))
  )
  with check (
    activity_id in (select a.id from public.activities a where public.can_access_project(a.project_id))
  );

drop policy if exists "company members access checklist_results" on public.checklist_results;
create policy "scoped access checklist_results" on public.checklist_results
  for all using (
    submission_id in (
      select s.id from public.submissions s
      join public.activities a on a.id = s.activity_id
      where public.can_access_project(a.project_id)
    )
  )
  with check (
    submission_id in (
      select s.id from public.submissions s
      join public.activities a on a.id = s.activity_id
      where public.can_access_project(a.project_id)
    )
  );

drop policy if exists "company members access submission_images" on public.submission_images;
create policy "scoped access submission_images" on public.submission_images
  for all using (
    submission_id in (
      select s.id from public.submissions s
      join public.activities a on a.id = s.activity_id
      where public.can_access_project(a.project_id)
    )
  )
  with check (
    submission_id in (
      select s.id from public.submissions s
      join public.activities a on a.id = s.activity_id
      where public.can_access_project(a.project_id)
    )
  );

drop policy if exists "company members access budget_actual_entries" on public.budget_actual_entries;
create policy "scoped access budget_actual_entries" on public.budget_actual_entries
  for all using (
    activity_id in (select a.id from public.activities a where public.can_access_project(a.project_id))
  )
  with check (
    activity_id in (select a.id from public.activities a where public.can_access_project(a.project_id))
  );

drop policy if exists "company members access document_folders" on public.document_folders;
create policy "scoped access document_folders" on public.document_folders
  for all using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

drop policy if exists "company members access documents" on public.documents;
create policy "scoped access documents" on public.documents
  for all using (
    folder_id in (select f.id from public.document_folders f where public.can_access_project(f.project_id))
  )
  with check (
    folder_id in (select f.id from public.document_folders f where public.can_access_project(f.project_id))
  );

drop policy if exists "company members access tasks" on public.tasks;
create policy "scoped access tasks" on public.tasks
  for all using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));
