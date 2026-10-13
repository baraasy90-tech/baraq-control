-- سيناريو حقيقي من المستخدم: مدير المشروع يرسل طلب مادة لموظف المشتريات المحدد بالمشروع
-- (0056 حلّ هذا الجزء) ← موظف المشتريات يرفق عرضه ← لو العرض غير مناسب، مدير المشروع
-- يحتاج "يرجّع" المعاملة لموظف المشتريات لتعديل العرض بدل ما يرفض الطلب كاملاً ويجبره
-- يبدأ من الصفر (اللي كان يفعله review_approval_step سابقاً: أي رفض = نهاية السلسلة).
--
-- نفس نمط send_back_internal_approval_step المبني بـ 0055 لطلبات "طلباتي"، لكن على
-- جدولي approval_chains/approval_chain_steps (طلبات المواد). سلسلة العينة (sourcing)
-- تصير "شبكية" (network) عشان تسمح بالإرجاع؛ سلسلة الشراء الرسمي (المرحلة 2) تبقى
-- "خطية" (linear) كالسابق ما لم يُطلب غير ذلك.

alter table public.approval_chains
  add column chain_type text not null default 'linear' check (chain_type in ('linear', 'network'));

-- ===== سلسلة العينة الثابتة: مشتريات ← مقدّم الطلب ← رئيس قسم إدارة المشروع، شبكية =====
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

  insert into public.approval_chains (material_request_id, phase, chain_type, created_by, requester_note)
  values (p_request_id, 'sample', 'network', auth.uid(), p_note)
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

-- ===== إرجاع مرحلة نشطة لمرحلة سابقة (سلاسل "شبكية" فقط) بدل الرفض النهائي =====
create or replace function public.send_back_approval_step(p_step_id uuid, p_target_step_id uuid, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_assigned_user_id uuid;
  v_step_status text;
  v_chain_status text;
  v_chain_type text;
  v_company_id uuid;
  v_target_chain_id uuid;
  v_target_order integer;
begin
  select acs.chain_id, acs.step_order, acs.assigned_user_id, acs.status
  into v_chain_id, v_step_order, v_assigned_user_id, v_step_status
  from public.approval_chain_steps acs where acs.id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;

  select ac.status, ac.chain_type, p.company_id
  into v_chain_status, v_chain_type, v_company_id
  from public.approval_chains ac
  join public.material_requests mr on mr.id = ac.material_request_id
  join public.projects p on p.id = mr.project_id
  where ac.id = v_chain_id;

  if v_chain_type <> 'network' then
    raise exception 'الإرجاع لمرحلة سابقة متاح فقط للسلاسل الشبكية';
  end if;
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
    raise exception 'يلزم توجيه هذه المرحلة لشخص محدد قبل التصرف بها';
  end if;
  if v_assigned_user_id <> auth.uid() and not public.can_manage_org(v_company_id) then
    raise exception 'لا تملك صلاحية إرجاع هذه المرحلة';
  end if;
  if p_note is null or trim(p_note) = '' then
    raise exception 'لازم توضيح سبب الإرجاع';
  end if;

  select chain_id, step_order into v_target_chain_id, v_target_order
  from public.approval_chain_steps where id = p_target_step_id;

  if v_target_chain_id is distinct from v_chain_id then
    raise exception 'المرحلة المستهدفة ليست ضمن نفس السلسلة';
  end if;
  if v_target_order >= v_step_order then
    raise exception 'الإرجاع يكون فقط لمرحلة سابقة';
  end if;

  update public.approval_chain_steps
  set status = 'pending', acted_by = null, acted_at = null,
      note = case when id = p_target_step_id then p_note else null end
  where chain_id = v_chain_id and step_order between v_target_order and v_step_order;
end;
$$;

grant execute on function public.send_back_approval_step(uuid, uuid, text) to authenticated;
