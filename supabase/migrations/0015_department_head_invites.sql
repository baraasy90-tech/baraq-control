-- ============================================================
-- السماح لرئيس أي قسم بإدارة أعضاء قسمه هو تحديداً (دعوة/تعديل دور/نقل)
-- دون الحاجة لأن يكون مالك الشركة أو تنفيذياً — بشرط ألا يتجاوز قسمه.
-- ============================================================

create or replace function public.can_manage_department(p_department_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.departments d
    where d.id = p_department_id
    and (
      public.can_manage_org(d.company_id)
      or exists (
        select 1 from public.department_members dm
        where dm.department_id = p_department_id and dm.user_id = auth.uid() and dm.role = 'head'
      )
    )
  );
$$;

drop policy if exists "org managers manage department_members" on public.department_members;
create policy "department managers manage department_members" on public.department_members
  for all using (public.can_manage_department(department_id))
  with check (public.can_manage_department(department_id));

drop policy if exists "org managers insert invites" on public.invites;
create policy "department managers insert invites" on public.invites
  for insert with check (public.can_manage_department(department_id));

drop policy if exists "org managers update invites" on public.invites;
create policy "department managers update invites" on public.invites
  for update using (public.can_manage_department(department_id));

drop policy if exists "org managers delete invites" on public.invites;
create policy "department managers delete invites" on public.invites
  for delete using (public.can_manage_department(department_id));
