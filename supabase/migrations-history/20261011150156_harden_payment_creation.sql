-- Additive production upgrade; preserves existing rows and approved payments.
-- SECURITY DEFINER is confined to a trigger lookup, not a callable approval RPC.
create or replace function public.guard_workflow_creation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_project_id uuid;
  v_individual_owner boolean := false;
  v_initial_status text := tg_argv[0];
  v_row jsonb := to_jsonb(new);
begin
  if auth.uid() is null then
    raise exception 'يلزم تسجيل الدخول' using errcode = '42501';
  end if;

  if tg_table_name = 'budget_actual_entries' then
    select a.project_id into v_project_id from public.activities a where a.id = new.activity_id;
  elsif tg_table_name in ('contract_payments', 'contract_extra_works') then
    select c.project_id into v_project_id from public.contracts c where c.id = new.contract_id;
  end if;

  if v_project_id is not null then
    select co.is_individual and co.created_by = auth.uid()
    into v_individual_owner
    from public.projects p join public.companies co on co.id = p.company_id
    where p.id = v_project_id;
  end if;

  if new.status is distinct from v_initial_status then
    if not (new.status = 'approved' and coalesce(v_individual_owner, false)) then
      raise exception 'حالة الاعتماد الأولى محمية؛ استخدم إجراءات الاعتماد الرسمية' using errcode = '42501';
    end if;
    if (v_row ->> 'amount')::numeric is null or (v_row ->> 'amount')::numeric <= 0 then
      raise exception 'يلزم مبلغ موجب للاعتماد الفوري';
    end if;
  end if;

  if exists (
    select 1 from pg_catalog.jsonb_each(v_row) f
    where (f.key ~ '(^|_)(submitted|reviewed)_(by|at)$|(^|_)review_note$|^settled_at$|^settlement_note$')
      and f.value <> 'null'::jsonb
  ) then
    raise exception 'لا يمكن تعيين بيانات المعتمد عند إنشاء السجل' using errcode = '42501';
  end if;
  if tg_table_name = 'contracts' and (v_row ->> 'settlement_status') is distinct from 'open' then
    raise exception 'حالة التسوية الأولى محمية' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_workflow_creation() from public, anon, authenticated;

create trigger guard_budget_entries_creation before insert on public.budget_actual_entries
for each row execute function public.guard_workflow_creation('draft');
create trigger guard_contract_payments_creation before insert on public.contract_payments
for each row execute function public.guard_workflow_creation('pending');
create trigger guard_contract_extra_works_creation before insert on public.contract_extra_works
for each row execute function public.guard_workflow_creation('draft');
create trigger guard_contracts_creation before insert on public.contracts
for each row execute function public.guard_workflow_creation('draft');
create trigger guard_material_requests_creation before insert on public.material_requests
for each row execute function public.guard_workflow_creation('draft');

-- Lock the payment before deciding which approval stage can be changed.
CREATE OR REPLACE FUNCTION public.reset_budget_entry_to_draft(p_entry_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project_id uuid;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'يلزم تسجيل الدخول' using errcode = '42501';
  end if;
  select a.project_id, e.status into v_project_id, v_status
  from public.budget_actual_entries e
  join public.activities a on a.id = e.activity_id
  where e.id = p_entry_id for update of e;

  if v_project_id is null then
    raise exception 'الدفعة غير موجودة';
  end if;
  if not public.can_pm_approve(v_project_id) then
    raise exception 'لا تملك صلاحية إعادة هذه الدفعة للمسودة';
  end if;
  if v_status not in ('approved', 'rejected', 'pending_pm_approval', 'pending_finance_approval') then
    raise exception 'هذه الدفعة بمسودة بالفعل';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);
  update public.budget_actual_entries
  set status = 'draft',
      submitted_by = null, submitted_at = null,
      pm_reviewed_by = null, pm_reviewed_at = null, pm_review_note = null,
      finance_reviewed_by = null, finance_reviewed_at = null, finance_review_note = null
  where id = p_entry_id;
end;
$function$;
revoke all on function public.reset_budget_entry_to_draft(uuid) from public, anon;
grant execute on function public.reset_budget_entry_to_draft(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.review_budget_entry(p_entry_id uuid, p_approve boolean, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project_id uuid;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'يلزم تسجيل الدخول' using errcode = '42501';
  end if;
  select a.project_id, e.status into v_project_id, v_status
  from public.budget_actual_entries e
  join public.activities a on a.id = e.activity_id
  where e.id = p_entry_id for update of e;

  if v_project_id is null then
    raise exception 'الدفعة غير موجودة';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);

  if v_status = 'pending_pm_approval' then
    if not public.can_pm_approve(v_project_id) then
      raise exception 'لا تملك صلاحية اعتماد الدفعات الفعلية بهذه المرحلة (رئيس قسم إدارة المشاريع)';
    end if;
    update public.budget_actual_entries
    set status = case when p_approve then 'pending_finance_approval' else 'rejected' end,
        pm_reviewed_by = auth.uid(), pm_reviewed_at = now(), pm_review_note = p_note
    where id = p_entry_id;
  elsif v_status = 'pending_finance_approval' then
    if not public.can_finance_approve(v_project_id) then
      raise exception 'لا تملك صلاحية الاعتماد المالي النهائي';
    end if;
    update public.budget_actual_entries
    set status = case when p_approve then 'approved' else 'rejected' end,
        finance_reviewed_by = auth.uid(), finance_reviewed_at = now(), finance_review_note = p_note
    where id = p_entry_id;
  else
    raise exception 'هذه الدفعة ليست بانتظار اعتماد حالياً';
  end if;
end;
$function$;
revoke all on function public.review_budget_entry(uuid, boolean, text) from public, anon;
grant execute on function public.review_budget_entry(uuid, boolean, text) to authenticated;

CREATE OR REPLACE FUNCTION public.review_contract_payment(p_payment_id uuid, p_approve boolean, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project_id uuid;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'يلزم تسجيل الدخول' using errcode = '42501';
  end if;
  select p.project_id, cp.status into v_project_id, v_status
  from public.contract_payments cp
  join public.contracts c on c.id = cp.contract_id
  join public.projects p on p.id = c.project_id
  where cp.id = p_payment_id for update of cp;

  if v_project_id is null then
    raise exception 'الدفعة غير موجودة';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);

  if v_status = 'pending_pm_approval' then
    if not public.can_pm_approve(v_project_id) then
      raise exception 'لا تملك صلاحية اعتماد الدفعات بهذه المرحلة (رئيس قسم إدارة المشاريع)';
    end if;
    update public.contract_payments
    set status = case when p_approve then 'pending_finance_approval' else 'rejected' end,
        pm_reviewed_by = auth.uid(), pm_reviewed_at = now(), pm_review_note = p_note
    where id = p_payment_id;
  elsif v_status = 'pending_finance_approval' then
    if not public.can_finance_approve(v_project_id) then
      raise exception 'لا تملك صلاحية الاعتماد المالي النهائي';
    end if;
    update public.contract_payments
    set status = case when p_approve then 'approved' else 'rejected' end,
        finance_reviewed_by = auth.uid(), finance_reviewed_at = now(), finance_review_note = p_note
    where id = p_payment_id;
  else
    raise exception 'هذه الدفعة ليست بانتظار اعتماد حالياً';
  end if;
end;
$function$;
revoke all on function public.review_contract_payment(uuid, boolean, text) from public, anon;
grant execute on function public.review_contract_payment(uuid, boolean, text) to authenticated;

CREATE OR REPLACE FUNCTION public.submit_budget_entry(p_entry_id uuid)
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
  if auth.uid() is null then
    raise exception 'يلزم تسجيل الدخول' using errcode = '42501';
  end if;
  select a.project_id, e.status, e.amount into v_project_id, v_status, v_amount
  from public.budget_actual_entries e
  join public.activities a on a.id = e.activity_id
  where e.id = p_entry_id for update of e;

  if v_project_id is null then
    raise exception 'الدفعة غير موجودة';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا المشروع';
  end if;
  if v_status <> 'draft' then
    raise exception 'هذه الدفعة ليست في مرحلة مسودة';
  end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'لازم مبلغ صحيح للدفعة أولاً';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);
  update public.budget_actual_entries
  set status = 'pending_pm_approval', submitted_by = auth.uid(), submitted_at = now()
  where id = p_entry_id;
end;
$function$;
revoke all on function public.submit_budget_entry(uuid) from public, anon;
grant execute on function public.submit_budget_entry(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.submit_contract_payment(p_payment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project_id uuid;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'يلزم تسجيل الدخول' using errcode = '42501';
  end if;
  select p.project_id, cp.status into v_project_id, v_status
  from public.contract_payments cp
  join public.contracts c on c.id = cp.contract_id
  join public.projects p on p.id = c.project_id
  where cp.id = p_payment_id for update of cp;

  if v_project_id is null then
    raise exception 'الدفعة غير موجودة';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا المشروع';
  end if;
  if v_status <> 'pending' then
    raise exception 'هذه الدفعة ليست في مرحلة قابلة للتقديم';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);
  update public.contract_payments
  set status = 'pending_pm_approval', submitted_by = auth.uid(), submitted_at = now()
  where id = p_payment_id;
end;
$function$;
revoke all on function public.submit_contract_payment(uuid) from public, anon;
grant execute on function public.submit_contract_payment(uuid) to authenticated;

notify pgrst, 'reload schema';
