-- تصليب submit_material_sourcing بعد تجربة حقيقية كشفت المشكلة: الشركة يمكن يكون
-- عندها أكثر من قسم بنفس النوع (مثلاً "مشتريات 01" و"مشتريات 02")، والدالة كانت
-- تختار واحداً منهم عشوائياً (limit 1 بدون ترتيب) بدون أي تنبيه — فيتوجّه الطلب لقسم
-- ما فيه أعضاء بينما الموظفين الفعليين بقسم آخر بنفس الاسم تقريباً، ويظهر للمستخدم
-- كأن "قائمة التوجيه فاضية" بدون تفسير واضح للسبب.
--
-- الحل: لو فيه أكثر من قسم بنفس النوع المطلوب (مشتريات أو إدارة مشاريع)، ترفض الدالة
-- بخطأ واضح يطلب توحيد الأقسام أولاً، بدل الاختيار الصامت.

create or replace function public.submit_material_sourcing(p_request_id uuid, p_note text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
  v_created_by uuid;
  v_company_id uuid;
  v_procurement_dept uuid;
  v_procurement_count integer;
  v_pm_dept uuid;
  v_pm_count integer;
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

  select company_id into v_company_id from public.projects where id = v_project_id;

  select count(*) into v_procurement_count from public.departments where company_id = v_company_id and type = 'procurement';
  if v_procurement_count = 0 then
    raise exception 'ما فيه قسم "مشتريات" مُنشأ بهيكلة الشركة بعد — أنشئه أولاً من شاشة الهيكلة';
  elsif v_procurement_count > 1 then
    raise exception 'يوجد أكثر من قسم بنوع "مشتريات" بهيكلة الشركة (%) — وحّدها لقسم واحد قبل إرسال طلبات المواد', v_procurement_count;
  end if;
  select id into v_procurement_dept from public.departments where company_id = v_company_id and type = 'procurement';

  select count(*) into v_pm_count from public.departments where company_id = v_company_id and type = 'project_management';
  if v_pm_count = 0 then
    raise exception 'ما فيه قسم "إدارة المشاريع" مُنشأ بهيكلة الشركة';
  elsif v_pm_count > 1 then
    raise exception 'يوجد أكثر من قسم بنوع "إدارة المشاريع" بهيكلة الشركة (%) — وحّدها لقسم واحد قبل إرسال طلبات المواد', v_pm_count;
  end if;
  select id into v_pm_dept from public.departments where company_id = v_company_id and type = 'project_management';

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
