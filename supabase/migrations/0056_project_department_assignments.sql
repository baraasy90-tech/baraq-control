-- المشكلة الفعلية اللي كشفها استخدام حقيقي: submit_material_sourcing (0049/0052) يحاول
-- يخمّن قسم "المشتريات" وقسم "إدارة المشاريع" المسؤولَين عن كل طلب مادة بالبحث عن القسم
-- الوحيد بهذا النوع على مستوى الشركة كلها — وهذا خاطئ من الأساس لشركة عندها أكثر من قسم
-- مشتريات/إدارة مشاريع (فروع أو مواقع مختلفة). القسم المسؤول يجب أن يُحدَّد صراحة لكل
-- مشروع، من حساب المدير العام (مالك الحساب/الإدارة التنفيذية) — لاحقاً يقدر رئيس ذاك
-- القسم يوجّه الطلب لموظف محدد من فريقه (route_approval_step الموجودة أصلاً تكفي لهذا).
--
-- projects.department_id (من 0005) كان يُفترض به هذا الدور لقسم إدارة المشاريع لكنه ما
-- عاد يُملأ تلقائياً ولا توجد واجهة لتعديله — هذا التعديل يفعّله فعلياً + يضيف عموده
-- المكافئ للمشتريات.

alter table public.projects add column procurement_department_id uuid references public.departments (id) on delete set null;

alter table public.projects
  add constraint projects_procurement_department_same_company
  foreign key (procurement_department_id, company_id) references public.departments (id, company_id);

create or replace function public.set_project_departments(p_project_id uuid, p_department_id uuid, p_procurement_department_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select company_id into v_company_id from public.projects where id = p_project_id;
  if v_company_id is null then
    raise exception 'المشروع غير موجود';
  end if;
  if not public.can_manage_org(v_company_id) then
    raise exception 'لا تملك صلاحية تعديل أقسام هذا المشروع — مالك الحساب أو الإدارة التنفيذية فقط';
  end if;
  if p_department_id is not null and not exists (
    select 1 from public.departments where id = p_department_id and company_id = v_company_id
  ) then
    raise exception 'قسم إدارة المشروع المحدد غير تابع لهذه الشركة';
  end if;
  if p_procurement_department_id is not null and not exists (
    select 1 from public.departments where id = p_procurement_department_id and company_id = v_company_id
  ) then
    raise exception 'قسم المشتريات المحدد غير تابع لهذه الشركة';
  end if;

  update public.projects
  set department_id = p_department_id, procurement_department_id = p_procurement_department_id
  where id = p_project_id;
end;
$$;

grant execute on function public.set_project_departments(uuid, uuid, uuid) to authenticated;

-- ===== submit_material_sourcing: استخدام قسمَي المشروع المحدَّدين بدل التخمين على مستوى الشركة =====
create or replace function public.submit_material_sourcing(p_request_id uuid, p_note text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
  v_created_by uuid;
  v_procurement_dept uuid;
  v_pm_dept uuid;
  v_chain_id uuid;
begin
  select project_id, status, created_by into v_project_id, v_status, v_created_by
  from public.material_requests where id = p_request_id;

  if v_project_id is null then
    raise exception 'طلب المادة غير موجود';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا المشروع';
  end if;
  if v_status not in ('draft', 'sample_rejected') then
    raise exception 'هذا الطلب ليس في مرحلة تسمح بإرساله للمشتريات';
  end if;

  select procurement_department_id, department_id into v_procurement_dept, v_pm_dept
  from public.projects where id = v_project_id;

  if v_procurement_dept is null then
    raise exception 'لم يُحدَّد قسم المشتريات المسؤول عن هذا المشروع بعد — يحدده مدير الحساب من شاشة "فريق المشروع"';
  end if;
  if v_pm_dept is null then
    raise exception 'لم يُحدَّد قسم إدارة المشروع المسؤول عن هذا المشروع بعد — يحدده مدير الحساب من شاشة "فريق المشروع"';
  end if;

  insert into public.approval_chains (material_request_id, phase, created_by, requester_note)
  values (p_request_id, 'sample', auth.uid(), p_note)
  returning id into v_chain_id;

  insert into public.approval_chain_steps (chain_id, step_order, department_id, assigned_user_id) values
    (v_chain_id, 1, v_procurement_dept, null),
    (v_chain_id, 2, null, v_created_by),
    (v_chain_id, 3, v_pm_dept, null);

  perform set_config('app.bypass_workflow_guard', 'on', true);
  update public.material_requests set status = 'sample_pending' where id = p_request_id;

  return v_chain_id;
end;
$$;

grant execute on function public.submit_material_sourcing(uuid, text) to authenticated;
