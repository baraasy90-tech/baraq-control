-- إصلاح تعارض حقيقي بين نظام الحماية العام اللي أضافته الجلسة الثانية (0044) ونظام
-- سلسلة الاعتماد الديناميكية (0043/0049/0050):
--
--   1. guard_material_value_freeze() كانت تشير مباشرة لعمود material_requests.sample_price
--      اللي حذفناه بـ 0049 (السعر الآن يعيش بجدول material_request_options لكل بديل).
--      أي UPDATE على material_requests كان يفشل فوراً بخطأ "record has no field
--      sample_price" لأن الدالة PL/pgSQL تحاول تقرأ عمود غير موجود — هذا هو سبب رسالتي
--      "تعذّر حفظ البيانات" و"تعذّر إرسال الطلب لقسم المشتريات".
--   2. guard_material_requests_workflow trigger يحمي عمود status من التعديل المباشر
--      إلا عبر app.bypass_workflow_guard = 'on' — دوال submit_material_sourcing/
--      submit_material_purchase_chain/review_approval_step (0043/0049) تغيّر status
--      مباشرة بدون تفعيل هذا العلم، فكانت ستُرفض بمجرد إصلاح المشكلة الأولى.
--
-- الإصلاح: تحديث الدالتين لتطابق مخطط الجداول الحالي + إضافة تفعيل العلم بكل دالة من
-- دوال سلسلة الاعتماد اللي تعدّل material_requests.status.

-- ===== 1) تصحيح حارس تجميد القيمة: لا وجود لـ sample_price بعد الآن =====
create or replace function public.guard_material_value_freeze()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if current_setting('app.bypass_workflow_guard', true) = 'on' then
    return new;
  end if;
  if old.status not in ('sample_approved', 'purchase_rejected') and new.quote_price is distinct from old.quote_price then
    raise exception 'لا يمكن تعديل سعر عرض الشراء بعد رفعه للاعتماد';
  end if;
  return new;
end;
$$;

-- ===== 2) تبسيط قائمة الأعمدة المحمية بحارس سير العمل لتطابق المخطط الحالي =====
drop trigger if exists guard_material_requests_workflow on public.material_requests;
create trigger guard_material_requests_workflow
before update on public.material_requests
for each row execute function public.guard_protected_columns('status');

-- ===== 3) تفعيل علم تجاوز الحراسة بدوال سلسلة الاعتماد اللي تغيّر status =====
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

  select company_id into v_company_id from public.projects where id = v_project_id;

  select id into v_procurement_dept from public.departments where company_id = v_company_id and type = 'procurement' limit 1;
  if v_procurement_dept is null then
    raise exception 'ما فيه قسم "مشتريات" مُنشأ بهيكلة الشركة بعد — أنشئه أولاً من شاشة الهيكلة';
  end if;

  select id into v_pm_dept from public.departments where company_id = v_company_id and type = 'project_management' limit 1;
  if v_pm_dept is null then
    raise exception 'ما فيه قسم "إدارة المشاريع" مُنشأ بهيكلة الشركة';
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

create or replace function public.submit_material_purchase_chain(p_request_id uuid, p_steps jsonb, p_note text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
  v_quote_price numeric;
  v_chain_id uuid;
  v_step jsonb;
  v_order integer := 0;
begin
  select project_id, status, quote_price into v_project_id, v_status, v_quote_price
  from public.material_requests where id = p_request_id;

  if v_project_id is null then
    raise exception 'طلب المادة غير موجود';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا المشروع';
  end if;
  if v_status not in ('sample_approved', 'purchase_rejected') then
    raise exception 'يلزم اعتماد العينة أولاً قبل تقديم طلب الشراء الرسمي';
  end if;
  if v_quote_price is null then
    raise exception 'لازم إدخال سعر عرض السعر أولاً';
  end if;
  if p_steps is null or jsonb_array_length(p_steps) = 0 then
    raise exception 'لازم تحديد جهة اعتماد واحدة على الأقل';
  end if;

  insert into public.approval_chains (material_request_id, phase, created_by, requester_note)
  values (p_request_id, 'purchase', auth.uid(), p_note)
  returning id into v_chain_id;

  for v_step in select * from jsonb_array_elements(p_steps) loop
    v_order := v_order + 1;
    insert into public.approval_chain_steps (chain_id, step_order, department_id, assigned_user_id)
    values (v_chain_id, v_order, nullif(v_step->>'department_id', '')::uuid, nullif(v_step->>'user_id', '')::uuid);
  end loop;

  perform set_config('app.bypass_workflow_guard', 'on', true);
  update public.material_requests set status = 'purchase_pending' where id = p_request_id;

  return v_chain_id;
end;
$$;

create or replace function public.review_approval_step(p_step_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_assigned_user_id uuid;
  v_step_department_id uuid;
  v_step_status text;
  v_chain_status text;
  v_phase text;
  v_material_request_id uuid;
  v_company_id uuid;
  v_max_order integer;
  v_department_type text;
begin
  select acs.chain_id, acs.step_order, acs.assigned_user_id, acs.department_id, acs.status
  into v_chain_id, v_step_order, v_assigned_user_id, v_step_department_id, v_step_status
  from public.approval_chain_steps acs where acs.id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;

  select ac.status, ac.phase, ac.material_request_id, p.company_id
  into v_chain_status, v_phase, v_material_request_id, v_company_id
  from public.approval_chains ac
  join public.material_requests mr on mr.id = ac.material_request_id
  join public.projects p on p.id = mr.project_id
  where ac.id = v_chain_id;

  if v_chain_status <> 'pending' then
    raise exception 'سلسلة الاعتماد هذه غير نشطة حالياً';
  end if;
  if v_step_status <> 'pending' then
    raise exception 'هذه المرحلة ليست بانتظار إجراء';
  end if;
  if exists (
    select 1 from public.approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> 'approved'
  ) then
    raise exception 'لم يصل الدور لهذه المرحلة بعد';
  end if;
  if v_assigned_user_id is null then
    raise exception 'يلزم توجيه هذه المرحلة لشخص محدد قبل اعتمادها';
  end if;
  if v_assigned_user_id <> auth.uid() and not public.can_manage_org(v_company_id) then
    raise exception 'لا تملك صلاحية الاعتماد على هذه المرحلة';
  end if;
  if not p_approve and (p_note is null or trim(p_note) = '') then
    raise exception 'لازم توضيح سبب الرفض';
  end if;

  if p_approve and v_step_department_id is not null then
    select type into v_department_type from public.departments where id = v_step_department_id;
    if v_department_type = 'procurement' and not exists (
      select 1 from public.material_request_options where material_request_id = v_material_request_id
    ) then
      raise exception 'لازم إرفاق عرض سعر واحد على الأقل قبل اعتماد مرحلة المشتريات';
    end if;
  end if;

  update public.approval_chain_steps
  set status = case when p_approve then 'approved' else 'rejected' end,
      acted_by = auth.uid(), acted_at = now(), note = p_note
  where id = p_step_id;

  perform set_config('app.bypass_workflow_guard', 'on', true);

  if not p_approve then
    update public.approval_chain_steps set status = 'skipped' where chain_id = v_chain_id and status = 'pending';
    update public.approval_chains set status = 'rejected', decided_at = now() where id = v_chain_id;
    update public.material_requests
    set status = case when v_phase = 'sample' then 'sample_rejected' else 'purchase_rejected' end
    where id = v_material_request_id;
  else
    select max(step_order) into v_max_order from public.approval_chain_steps where chain_id = v_chain_id;
    if v_step_order = v_max_order then
      update public.approval_chains set status = 'approved', decided_at = now() where id = v_chain_id;
      update public.material_requests
      set status = case when v_phase = 'sample' then 'sample_approved' else 'purchase_approved' end
      where id = v_material_request_id;
    end if;
  end if;
end;
$$;
