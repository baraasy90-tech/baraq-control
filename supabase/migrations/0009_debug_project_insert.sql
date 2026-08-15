-- تشخيص: تبسيط مؤقت لسياسة projects لعزل السبب الحقيقي لفشل الإدراج
drop policy if exists "scoped access projects" on public.projects;

create policy "scoped access projects" on public.projects
  for all using (public.can_access_project(id))
  with check (public.is_company_owner(company_id) or public.is_executive(company_id));
