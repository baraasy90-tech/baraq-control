-- ============================================================
-- الإصلاح النهائي: المشكلة الحقيقية لم تكن بجملة WITH CHECK وحدها —
-- عند استخدام .insert().select() (وهو ما يفعله كل كود التطبيق)، يضيف
-- Postgres تحقّق ضمني عبر RETURNING يعتمد على جملة USING نفسها (سياسة
-- SELECT الفعلية). USING كانت لا تزال تستخدم can_access_project(id)
-- التي تُعيد الاستعلام عن جدول projects نفسه بحثاً عن الصف الجديد —
-- وهو نفس خطأ "الصف غير مرئي بعد" لكن بجملة مختلفة (USING بدل WITH CHECK).
-- الحل النهائي: نتحقق من أعمدة الصف مباشرة بكلا الجملتين، بدون أي
-- استعلام يعيد قراءة جدول projects من داخل سياسته الخاصة.
-- ============================================================

drop policy if exists "scoped access projects" on public.projects;

create policy "scoped access projects" on public.projects
  for all using (
    public.is_company_owner(company_id)
    or public.is_executive(company_id)
    or exists (
      select 1 from public.department_members dm
      where dm.department_id = projects.department_id and dm.user_id = auth.uid() and dm.role = 'head'
    )
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = projects.id and pm.user_id = auth.uid()
    )
  )
  with check (
    public.is_company_owner(company_id)
    or public.is_executive(company_id)
    or exists (
      select 1 from public.department_members dm
      where dm.department_id = projects.department_id and dm.user_id = auth.uid() and dm.role = 'head'
    )
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = projects.id and pm.user_id = auth.uid()
    )
  );
