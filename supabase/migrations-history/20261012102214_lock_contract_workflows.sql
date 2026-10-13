-- Lock each workflow target before checking its current approval state.

CREATE OR REPLACE FUNCTION public.review_contract(p_contract_id uuid, p_approve boolean, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project_id uuid;
  v_status text;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'يلزم حساب مسجل' using errcode='42501'; end if;
  select project_id, status into v_project_id, v_status from public.contracts where id = p_contract_id for update;
  if v_project_id is null then
    raise exception 'العقد غير موجود';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);

  if v_status = 'pending_pm_approval' then
    if not public.can_pm_approve(v_project_id) then
      raise exception 'لا تملك صلاحية اعتماد العقود بهذه المرحلة (رئيس قسم إدارة المشاريع)';
    end if;
    update public.contracts
    set status = case when p_approve then 'pending_finance_approval' else 'rejected' end,
        pm_reviewed_by = auth.uid(), pm_reviewed_at = now(), pm_review_note = p_note
    where id = p_contract_id;
  elsif v_status = 'pending_finance_approval' then
    if not public.can_finance_approve(v_project_id) then
      raise exception 'لا تملك صلاحية الاعتماد المالي النهائي';
    end if;
    update public.contracts
    set status = case when p_approve then 'approved' else 'rejected' end,
        finance_reviewed_by = auth.uid(), finance_reviewed_at = now(), finance_review_note = p_note
    where id = p_contract_id;
  else
    raise exception 'هذا العقد ليس بانتظار اعتماد حالياً';
  end if;
end;
$function$;

revoke execute on function public.review_contract(uuid,boolean,text) from public, anon;

grant execute on function public.review_contract(uuid,boolean,text) to authenticated;

CREATE OR REPLACE FUNCTION public.submit_contract(p_contract_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project_id uuid;
  v_status text;
  v_total_value numeric;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'يلزم حساب مسجل' using errcode='42501'; end if;
  select project_id, status, total_value into v_project_id, v_status, v_total_value
  from public.contracts where id = p_contract_id for update;

  if v_project_id is null then
    raise exception 'العقد غير موجود';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا المشروع';
  end if;
  if v_status <> 'draft' then
    raise exception 'هذا العقد ليس في مرحلة مسودة';
  end if;
  if v_total_value is null or v_total_value <= 0 then
    raise exception 'لازم إدخال قيمة صحيحة للعقد أولاً';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);
  update public.contracts
  set status = 'pending_pm_approval', submitted_by = auth.uid(), submitted_at = now()
  where id = p_contract_id;
end;
$function$;

revoke execute on function public.submit_contract(uuid) from public, anon;

grant execute on function public.submit_contract(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.reset_contract_to_draft(p_contract_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project_id uuid;
  v_status text;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'يلزم حساب مسجل' using errcode='42501'; end if;
  select project_id, status into v_project_id, v_status from public.contracts where id = p_contract_id for update;
  if v_project_id is null then
    raise exception 'العقد غير موجود';
  end if;
  if not public.can_pm_approve(v_project_id) then
    raise exception 'لا تملك صلاحية إعادة العقد للمسودة';
  end if;
  if v_status <> 'approved' then
    raise exception 'لا يمكن إعادة عقد لم يُعتمد بعد إلى المسودة';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);
  update public.contracts
  set status = 'draft',
      submitted_by = null, submitted_at = null,
      pm_reviewed_by = null, pm_reviewed_at = null, pm_review_note = null,
      finance_reviewed_by = null, finance_reviewed_at = null, finance_review_note = null
  where id = p_contract_id;
end;
$function$;

revoke execute on function public.reset_contract_to_draft(uuid) from public, anon;

grant execute on function public.reset_contract_to_draft(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.delete_contract(p_contract_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project_id uuid;
  v_status text;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'يلزم حساب مسجل' using errcode='42501'; end if;
  select project_id, status into v_project_id, v_status from public.contracts where id = p_contract_id for update;

  if v_project_id is null then
    raise exception 'العقد غير موجود';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية حذف هذا العقد';
  end if;
  if v_status not in ('draft', 'rejected') then
    raise exception 'لا يمكن حذف عقد معتمد أو قيد الاعتماد — فقط العقود بحالة مسودة أو مرفوضة';
  end if;

  delete from public.contracts where id = p_contract_id;
end;
$function$;

revoke execute on function public.delete_contract(uuid) from public, anon;

grant execute on function public.delete_contract(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.review_contract_settlement(p_contract_id uuid, p_approve boolean, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project_id uuid;
  v_settlement_status text;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'يلزم حساب مسجل' using errcode='42501'; end if;
  select project_id, settlement_status into v_project_id, v_settlement_status
  from public.contracts where id = p_contract_id for update;

  if v_project_id is null then
    raise exception 'العقد غير موجود';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);

  if v_settlement_status = 'pending_pm_approval' then
    if not public.can_pm_approve(v_project_id) then
      raise exception 'لا تملك صلاحية اعتماد التصفية بهذه المرحلة (رئيس قسم إدارة المشاريع)';
    end if;
    update public.contracts
    set settlement_status = case when p_approve then 'pending_finance_approval' else 'rejected' end,
        settlement_pm_reviewed_by = auth.uid(), settlement_pm_reviewed_at = now(), settlement_pm_review_note = p_note
    where id = p_contract_id;
  elsif v_settlement_status = 'pending_finance_approval' then
    if not public.can_finance_approve(v_project_id) then
      raise exception 'لا تملك صلاحية الاعتماد المالي النهائي للتصفية';
    end if;
    update public.contracts
    set settlement_status = case when p_approve then 'settled' else 'rejected' end,
        settlement_finance_reviewed_by = auth.uid(), settlement_finance_reviewed_at = now(), settlement_finance_review_note = p_note,
        settled_at = case when p_approve then now() else null end
    where id = p_contract_id;
  else
    raise exception 'هذا العقد ليس بانتظار اعتماد تصفية حالياً';
  end if;
end;
$function$;

revoke execute on function public.review_contract_settlement(uuid,boolean,text) from public, anon;

grant execute on function public.review_contract_settlement(uuid,boolean,text) to authenticated;

CREATE OR REPLACE FUNCTION public.submit_contract_settlement(p_contract_id uuid, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project_id uuid;
  v_status text;
  v_settlement_status text;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'يلزم حساب مسجل' using errcode='42501'; end if;
  select project_id, status, settlement_status into v_project_id, v_status, v_settlement_status
  from public.contracts where id = p_contract_id for update;

  if v_project_id is null then
    raise exception 'العقد غير موجود';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا المشروع';
  end if;
  if v_status <> 'approved' then
    raise exception 'لا يمكن بدء التصفية النهائية إلا لعقد معتمد';
  end if;
  if v_settlement_status not in ('open', 'rejected') then
    raise exception 'إجراء التصفية النهائية بدأ بالفعل لهذا العقد';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);
  update public.contracts
  set settlement_status = 'pending_pm_approval',
      settlement_note = p_note,
      settlement_submitted_by = auth.uid(), settlement_submitted_at = now(),
      settlement_pm_reviewed_by = null, settlement_pm_reviewed_at = null, settlement_pm_review_note = null,
      settlement_finance_reviewed_by = null, settlement_finance_reviewed_at = null, settlement_finance_review_note = null
  where id = p_contract_id;
end;
$function$;

revoke execute on function public.submit_contract_settlement(uuid,text) from public, anon;

grant execute on function public.submit_contract_settlement(uuid,text) to authenticated;

CREATE OR REPLACE FUNCTION public.review_contract_extra_work(p_extra_work_id uuid, p_approve boolean, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project_id uuid;
  v_status text;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'يلزم حساب مسجل' using errcode='42501'; end if;
  select p.id, ew.status into v_project_id, v_status
  from public.contract_extra_works ew
  join public.contracts c on c.id = ew.contract_id
  join public.projects p on p.id = c.project_id
  where ew.id = p_extra_work_id for update of ew;

  if v_project_id is null then
    raise exception 'البند غير موجود';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);

  if v_status = 'pending_pm_approval' then
    if not public.can_pm_approve(v_project_id) then
      raise exception 'لا تملك صلاحية اعتماد الأعمال الإضافية بهذه المرحلة (رئيس قسم إدارة المشاريع)';
    end if;
    update public.contract_extra_works
    set status = case when p_approve then 'pending_finance_approval' else 'rejected' end,
        pm_reviewed_by = auth.uid(), pm_reviewed_at = now(), pm_review_note = p_note
    where id = p_extra_work_id;
  elsif v_status = 'pending_finance_approval' then
    if not public.can_finance_approve(v_project_id) then
      raise exception 'لا تملك صلاحية الاعتماد المالي النهائي';
    end if;
    update public.contract_extra_works
    set status = case when p_approve then 'approved' else 'rejected' end,
        finance_reviewed_by = auth.uid(), finance_reviewed_at = now(), finance_review_note = p_note
    where id = p_extra_work_id;
  else
    raise exception 'هذا البند ليس بانتظار اعتماد حالياً';
  end if;
end;
$function$;

revoke execute on function public.review_contract_extra_work(uuid,boolean,text) from public, anon;

grant execute on function public.review_contract_extra_work(uuid,boolean,text) to authenticated;

CREATE OR REPLACE FUNCTION public.submit_contract_extra_work(p_extra_work_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project_id uuid;
  v_status text;
  v_amount numeric;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'يلزم حساب مسجل' using errcode='42501'; end if;
  select p.id, ew.status, ew.amount into v_project_id, v_status, v_amount
  from public.contract_extra_works ew
  join public.contracts c on c.id = ew.contract_id
  join public.projects p on p.id = c.project_id
  where ew.id = p_extra_work_id for update of ew;

  if v_project_id is null then
    raise exception 'البند غير موجود';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا المشروع';
  end if;
  if v_status not in ('draft', 'rejected') then
    raise exception 'هذا البند ليس في مرحلة تسمح بالتقديم للاعتماد';
  end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'لازم إدخال قيمة صحيحة للبند أولاً';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);
  update public.contract_extra_works
  set status = 'pending_pm_approval',
      submitted_by = auth.uid(), submitted_at = now(),
      pm_reviewed_by = null, pm_reviewed_at = null, pm_review_note = null,
      finance_reviewed_by = null, finance_reviewed_at = null, finance_review_note = null
  where id = p_extra_work_id;
end;
$function$;

revoke execute on function public.submit_contract_extra_work(uuid) from public, anon;

grant execute on function public.submit_contract_extra_work(uuid) to authenticated;

notify pgrst,'reload schema';