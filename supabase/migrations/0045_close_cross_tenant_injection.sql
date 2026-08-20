-- إصلاح M1 وM2 من تدقيق RLS: حقن سجلات داخل شركة أخرى (Cross-tenant injection).
--
-- M1: سياسة INSERT على internal_requests كانت تتحقق فقط من user_id = auth.uid()،
-- بينما company_id/department_id/target_user_id تُرسل من المتصفح بدون أي تحقق —
-- أي مستخدم يقدر يُدرج "طلباً داخلياً" بـ company_id لشركة أخرى بالكامل، فيظهر
-- كطلب شرعي داخل صندوق واردات تلك الشركة مع مرفق/نص يتحكم به المهاجم.
--
-- M2: سياسة INSERT على projects تتحقق من هوية المستخدم (مالك/تنفيذي/رئيس قسم/عضو
-- مشروع) لكن لا تربط ذلك بأن company_id المُرسَل هو فعلاً شركة ذلك المستخدم —
-- رئيس قسم بشركته يقدر يُدرج مشروعاً بـ company_id لشركة أخرى وقسمه هو (بشركته)،
-- فيظهر المشروع داخل تقارير الشركة الأخرى بينما يحتفظ هو بصلاحية الوصول الكاملة له.

-- ============================================================
-- M1: internal_requests
-- ============================================================
drop policy if exists "user inserts own internal_requests" on public.internal_requests;
create policy "user inserts own internal_requests" on public.internal_requests
  for insert with check (
    user_id = auth.uid()
    and company_id = public.current_company_id()
    and (
      department_id is null
      or department_id in (select id from public.departments where company_id = public.current_company_id())
    )
    and (
      target_user_id is null
      or target_user_id in (select id from public.profiles where company_id = public.current_company_id())
    )
  );

-- can_review_request كانت تمنح رئيس أي قسم بنفس المعرف صلاحية المراجعة دون التأكد
-- أن ذلك القسم فعلاً تابع لشركة الطلب — إغلاق إضافي مكمّل لـ M1 (M3 من التقرير).
create or replace function public.can_review_request(p_request_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_company_id uuid;
  v_department_id uuid;
  v_target_user_id uuid;
begin
  select company_id, department_id, target_user_id into v_company_id, v_department_id, v_target_user_id
  from public.internal_requests where id = p_request_id;

  if v_company_id is null then
    return false;
  end if;

  if public.can_manage_org(v_company_id) then
    return true;
  end if;

  if v_target_user_id is not null and v_target_user_id = auth.uid() then
    return true;
  end if;

  if v_department_id is not null and exists (
    select 1 from public.department_members dm
    join public.departments d on d.id = dm.department_id
    where dm.department_id = v_department_id
      and dm.user_id = auth.uid()
      and dm.role = 'head'
      and d.company_id = v_company_id
  ) then
    return true;
  end if;

  return false;
end;
$$;

-- ============================================================
-- M2: projects
-- ============================================================
alter table public.departments
  add constraint departments_id_company_uk unique (id, company_id);

alter table public.projects
  add constraint projects_department_same_company
  foreign key (department_id, company_id) references public.departments (id, company_id);

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
    company_id = public.current_company_id()
    and (
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
  );
