-- ============================================================
-- إصلاح: سياسة INSERT على projects كانت تستدعي can_access_project(id)،
-- وهي دالة تعيد الاستعلام عن جدول projects نفسه بحثاً عن الصف الجديد —
-- الصف الجديد غير مرئي بعد لهذا الاستعلام الفرعي أثناء تنفيذ نفس أمر
-- الإدراج، فتفشل كل عملية إنشاء مشروع جديد بخطأ RLS. الإصلاح: نتحقق من
-- أعمدة الصف نفسه مباشرة بدل إعادة الاستعلام عن جدول projects.
-- ============================================================

drop policy if exists "scoped access projects" on public.projects;

create policy "scoped access projects" on public.projects
  for all using (public.can_access_project(id))
  with check (
    public.is_company_owner(company_id)
    or public.is_executive(company_id)
    or exists (
      select 1 from public.department_members dm
      where dm.department_id = department_id and dm.user_id = auth.uid() and dm.role = 'head'
    )
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = id and pm.user_id = auth.uid()
    )
  );
