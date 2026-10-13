-- Verified repair set. Original individual scripts are preserved in migrations-history.

BEGIN;

-- Source: 20261011150156_harden_payment_creation.sql

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


-- Source: 20261011150157_save_receiving_atomically.sql

-- One database transaction for the submission, checklist, images and completion date.
-- SECURITY INVOKER keeps existing RLS policies active for every statement.
create or replace function public.save_receiving_submission(
  p_submission_id uuid, p_activity_id uuid, p_create boolean,
  p_manager_name text, p_manager_signature_url text, p_decision text, p_notes text,
  p_results jsonb, p_images text[]
) returns public.submissions
language plpgsql security invoker set search_path = '' as $$
declare
  v_submission public.submissions;
  v_activity public.activities;
  v_results jsonb;
  v_saved_results jsonb;
  v_images text[];
  v_saved_images text[];
  v_exists boolean;
begin
  if auth.uid() is null then
    raise exception 'يلزم تسجيل الدخول' using errcode = '42501';
  end if;
  if p_submission_id is null or p_activity_id is null or p_create is null then
    raise exception 'معرّف التقديم أو النشاط غير صالح';
  end if;
  select * into v_activity from public.activities where id = p_activity_id for update;
  if not found or not public.can_access_project(v_activity.project_id) then
    raise exception 'النشاط غير موجود أو لا تملك صلاحية الوصول' using errcode = '42501';
  end if;
  if nullif(trim(p_manager_name), '') is null or nullif(trim(p_manager_signature_url), '') is null then
    raise exception 'يلزم اسم المدير وتوقيعه';
  end if;
  if p_decision is null or p_decision not in ('approved', 'approvedWithNotes', 'rejected') then
    raise exception 'قرار الاستلام غير صالح';
  end if;
  if p_results is null or jsonb_typeof(p_results) <> 'array' or p_images is null then
    raise exception 'نتائج الاستلام والصور غير صالحة';
  end if;

  -- Validate the whole payload before replacing any existing child rows.
  if exists (
    select 1 from pg_catalog.jsonb_to_recordset(p_results)
      as r(checklist_item_id uuid, checked boolean, image_url text)
    left join public.checklist_items ci on ci.id = r.checklist_item_id and ci.activity_id = p_activity_id
    where ci.id is null or r.checked is null
      or (ci.photo_required and nullif(trim(r.image_url), '') is null)
  ) or (select count(*) from pg_catalog.jsonb_to_recordset(p_results) as r(checklist_item_id uuid))
       <> (select count(distinct r.checklist_item_id) from pg_catalog.jsonb_to_recordset(p_results) as r(checklist_item_id uuid))
     or jsonb_array_length(p_results) <> (select count(*) from public.checklist_items where activity_id = p_activity_id)
  then
    raise exception 'قائمة الاستلام ناقصة أو تحتوي بنداً من نشاط آخر أو صورة مطلوبة مفقودة';
  end if;
  if exists(select 1 from unnest(p_images) u(url) where nullif(trim(u.url), '') is null) then
    raise exception 'رابط صورة الاستلام غير صالح';
  end if;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.checklist_item_id), '[]'::jsonb)
  into v_results from pg_catalog.jsonb_to_recordset(p_results)
    as r(checklist_item_id uuid, checked boolean, image_url text);
  select coalesce(array_agg(url order by url), array[]::text[]) into v_images from unnest(p_images) u(url);

  select * into v_submission from public.submissions where id = p_submission_id for update;
  v_exists := found;
  if v_exists and v_submission.activity_id <> p_activity_id then
    raise exception 'لا يمكن نقل تقديم استلام إلى نشاط آخر' using errcode = '42501';
  end if;

  if p_create and v_exists then
    select coalesce(jsonb_agg(jsonb_build_object('checklist_item_id', checklist_item_id, 'checked', checked, 'image_url', image_url)
      order by checklist_item_id), '[]'::jsonb)
    into v_saved_results from public.checklist_results where submission_id = p_submission_id;
    select coalesce(array_agg(image_url order by image_url), array[]::text[])
    into v_saved_images from public.submission_images where submission_id = p_submission_id;
    if v_submission.manager_name is distinct from trim(p_manager_name)
       or v_submission.manager_signature_url is distinct from p_manager_signature_url
       or v_submission.decision is distinct from p_decision
       or v_submission.notes is distinct from p_notes
       or v_saved_results is distinct from v_results or v_saved_images is distinct from v_images then
      raise exception 'سبق حفظ هذا التقديم ببيانات مختلفة. أغلق النموذج وحدّث قائمة الاستلام قبل المتابعة';
    end if;
    return v_submission; -- Idempotent retry of the same form payload.
  elsif p_create then
    insert into public.submissions(id, activity_id, manager_name, manager_signature_url, decision, notes)
    values(p_submission_id, p_activity_id, trim(p_manager_name), p_manager_signature_url, p_decision, p_notes)
    returning * into v_submission;
  else
    if not v_exists then
      raise exception 'التقديم غير موجود أو لا تملك صلاحية تعديله' using errcode = '42501';
    end if;
    update public.submissions set manager_name = trim(p_manager_name),
      manager_signature_url = p_manager_signature_url, decision = p_decision, notes = p_notes
    where id = p_submission_id returning * into v_submission;
    if not found then
      raise exception 'لم يتم تعديل التقديم' using errcode = '42501';
    end if;
    delete from public.checklist_results where submission_id = p_submission_id;
    delete from public.submission_images where submission_id = p_submission_id;
  end if;

  insert into public.checklist_results(submission_id, checklist_item_id, checked, image_url)
  select p_submission_id, r.checklist_item_id, r.checked, r.image_url
  from pg_catalog.jsonb_to_recordset(p_results) as r(checklist_item_id uuid, checked boolean, image_url text);
  insert into public.submission_images(submission_id, image_url)
  select p_submission_id, u.url from unnest(p_images) u(url);

  if p_decision = 'approved' then
    update public.activities set actual_end_date = coalesce(actual_end_date, (now() at time zone 'Asia/Riyadh')::date)
    where id = p_activity_id;
    if not found then
      raise exception 'لم يتم تسجيل تاريخ انتهاء النشاط' using errcode = '42501';
    end if;
  end if;
  return v_submission;
end;
$$;
revoke all on function public.save_receiving_submission(uuid, uuid, boolean, text, text, text, text, jsonb, text[]) from public, anon;
grant execute on function public.save_receiving_submission(uuid, uuid, boolean, text, text, text, text, jsonb, text[]) to authenticated;
notify pgrst, 'reload schema';


-- Source: 20261012094835_protect_edge_requests.sql

-- Internal counters are not exposed through the Data API. Only verified Edge code can consume quotas.
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to service_role;
create table app_private.edge_request_limits (
  actor_id uuid not null references auth.users(id) on delete cascade,
  operation text not null check(operation in ('send-invite-email','support-chat')),
  window_start timestamptz not null,
  requests integer not null check(requests>=0),
  last_request_at timestamptz not null,
  primary key(actor_id,operation)
);
alter table app_private.edge_request_limits enable row level security;
revoke all on app_private.edge_request_limits from public,anon,authenticated;
grant select,insert,update on app_private.edge_request_limits to service_role;

create or replace function public.consume_edge_request(p_actor_id uuid,p_operation text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare
  v_limit integer;
  v_now timestamptz:=clock_timestamp();
  v_counter app_private.edge_request_limits;
begin
  if p_actor_id is null then return false; end if;
  v_limit:=case p_operation when 'send-invite-email' then 5 when 'support-chat' then 20 else null end;
  if v_limit is null then raise exception 'Unsupported request operation'; end if;
  insert into app_private.edge_request_limits values(p_actor_id,p_operation,v_now,0,v_now-interval '1 day')
  on conflict(actor_id,operation) do nothing;
  select * into v_counter from app_private.edge_request_limits where actor_id=p_actor_id and operation=p_operation for update;
  if v_counter.window_start<=v_now-interval '1 hour' then
    v_counter.requests:=0;v_counter.window_start:=v_now;
  end if;
  if v_counter.requests>=v_limit or (p_operation='send-invite-email' and v_counter.last_request_at>v_now-interval '1 minute') then return false; end if;
  update app_private.edge_request_limits set window_start=v_counter.window_start,requests=v_counter.requests+1,last_request_at=v_now where actor_id=p_actor_id and operation=p_operation;
  return true;
end;
$$;
revoke all on function public.consume_edge_request(uuid,text) from public,anon,authenticated;
grant execute on function public.consume_edge_request(uuid,text) to service_role;


-- Source: 20261012095826_restrict_public_function_access.sql

-- Current app RPCs require signed-in users; internal trigger/notification functions are not RPCs.
do $$ declare f record; v_policy record; v_using text; v_check text; v_guard constant text:='not coalesce((auth.jwt() ->> ''is_anonymous'')::boolean,false)'; begin
  for f in select n.nspname,p.proname,p.oid::regprocedure as signature,p.prorettype='pg_catalog.trigger'::regtype as is_trigger
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' and p.prosecdef
  loop
    execute format('revoke execute on function %s from public, anon',f.signature);
    if f.is_trigger or f.proname='notify_user' then
      execute format('revoke execute on function %s from authenticated',f.signature);
    end if;
  end loop;
  -- These application and private Storage policies were explicitly scoped to signed-in identities.
  -- TO authenticated alone does not exclude anonymous sign-in accounts; add a trusted JWT check.
  for v_policy in select * from pg_policies where schemaname in ('public','storage') and roles='{public}'::name[]
  loop
    v_using:=case when v_policy.qual is null then null else '('||v_policy.qual||') and ('||v_guard||')' end;
    v_check:=case when v_policy.cmd in ('INSERT','UPDATE','ALL') then '('||coalesce(v_policy.with_check,v_policy.qual,'true')||') and ('||v_guard||')' else null end;
    execute format('alter policy %I on %I.%I to authenticated%s%s',v_policy.policyname,v_policy.schemaname,v_policy.tablename,
      case when v_using is null then '' else ' using ('||v_using||')' end,
      case when v_check is null then '' else ' with check ('||v_check||')' end);
  end loop;
end $$;
create or replace function public.generate_company_code()
returns text language sql set search_path='' as $$
 select pg_catalog.upper(pg_catalog.substr(pg_catalog.encode(extensions.gen_random_bytes(8),'hex'),1,10));
$$;
notify pgrst,'reload schema';



-- Source: 20261012101010_atomic_contract_and_checklist_save.sql

create or replace function public.save_contract_atomic(p_id uuid,p_create boolean,p_reset_to_draft boolean,p_data jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_existing public.contracts; v_next public.contracts; v_found boolean; begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'يلزم حساب مسجل' using errcode='42501'; end if;
 if p_id is null or p_create is null or p_reset_to_draft is null or p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'بيانات العقد غير صالحة'; end if;
 if exists(select 1 from jsonb_object_keys(p_data) k where k not in ('project_id','contract_name','pdf_url','start_date','duration_days','total_value','payment_terms','has_advance_payment','advance_payment_percentage','advance_payment_guarantee_note','advance_deduction_percentage','retention_percentage','retention_released','retention_release_note','vat_inclusive','vat_rate')) then raise exception 'حقول غير مسموحة في العقد'; end if;
 if nullif(trim(p_data->>'contract_name'),'') is null or nullif(p_data->>'project_id','') is null then raise exception 'يلزم اسم العقد والمشروع'; end if;
 perform 1 from public.projects where id=(p_data->>'project_id')::uuid for update;
 if not found or not public.can_access_project((p_data->>'project_id')::uuid) then raise exception 'لا تملك صلاحية المشروع' using errcode='42501'; end if;
 select * into v_existing from public.contracts where id=p_id for update;v_found:=found;
 if v_found and p_create then
  if to_jsonb(v_existing) @> p_data then return p_id; end if;
  raise exception 'سبق حفظ هذا العقد ببيانات مختلفة؛ حدّث القائمة';
 end if;
 if not v_found and not p_create then raise exception 'العقد غير موجود أو لا تملك صلاحية الوصول' using errcode='42501'; end if;
 if v_found and v_existing.project_id<>(p_data->>'project_id')::uuid then raise exception 'لا يمكن نقل العقد إلى مشروع آخر'; end if;
 select * into v_next from jsonb_populate_record(v_existing,p_data);
 if v_found then
  if p_reset_to_draft then perform public.reset_contract_to_draft(p_id); end if;
  update public.contracts set contract_name=v_next.contract_name,pdf_url=v_next.pdf_url,start_date=v_next.start_date,duration_days=v_next.duration_days,total_value=v_next.total_value,payment_terms=v_next.payment_terms,has_advance_payment=v_next.has_advance_payment,advance_payment_percentage=v_next.advance_payment_percentage,advance_payment_guarantee_note=v_next.advance_payment_guarantee_note,advance_deduction_percentage=v_next.advance_deduction_percentage,retention_percentage=v_next.retention_percentage,retention_released=v_next.retention_released,retention_release_note=v_next.retention_release_note,vat_inclusive=v_next.vat_inclusive,vat_rate=v_next.vat_rate where id=p_id;
  if not found then raise exception 'تعذّر تحديث العقد'; end if;
 else
  insert into public.contracts(id,project_id,contract_name,pdf_url,start_date,duration_days,total_value,payment_terms,has_advance_payment,advance_payment_percentage,advance_payment_guarantee_note,advance_deduction_percentage,retention_percentage,retention_released,retention_release_note,vat_inclusive,vat_rate)
  values(p_id,v_next.project_id,v_next.contract_name,v_next.pdf_url,v_next.start_date,v_next.duration_days,v_next.total_value,v_next.payment_terms,coalesce(v_next.has_advance_payment,false),v_next.advance_payment_percentage,v_next.advance_payment_guarantee_note,v_next.advance_deduction_percentage,v_next.retention_percentage,coalesce(v_next.retention_released,false),v_next.retention_release_note,coalesce(v_next.vat_inclusive,false),v_next.vat_rate);
 end if;
 return p_id;
end;
$$;
revoke all on function public.save_contract_atomic(uuid,boolean,boolean,jsonb) from public,anon;
grant execute on function public.save_contract_atomic(uuid,boolean,boolean,jsonb) to authenticated;

create or replace function public.save_checklist_atomic(p_activity_id uuid,p_items jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare v_activity public.activities;v_item record; begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'يلزم حساب مسجل' using errcode='42501'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'قائمة الاستلام غير صالحة'; end if;
 select * into v_activity from public.activities where id=p_activity_id for update;
 if not found or not public.can_access_project(v_activity.project_id) then raise exception 'لا تملك صلاحية النشاط' using errcode='42501'; end if;
 if exists(select 1 from jsonb_to_recordset(p_items) as i(id uuid,text text,photo_required boolean,"order" integer) where i.id is null or nullif(trim(i.text),'') is null or i.photo_required is null or i."order" is null) then raise exception 'بيانات بند غير صالحة'; end if;
 if (select count(*)<>count(distinct i.id) from jsonb_to_recordset(p_items) as i(id uuid)) then raise exception 'بند مكرر في القائمة'; end if;
 if exists(select 1 from public.checklist_items c join jsonb_to_recordset(p_items) as i(id uuid) on i.id=c.id where c.activity_id<>p_activity_id) then raise exception 'بند تابع لنشاط آخر'; end if;
 if exists(select 1 from public.checklist_items c join public.checklist_results r on r.checklist_item_id=c.id where c.activity_id=p_activity_id and not exists(select 1 from jsonb_to_recordset(p_items) as i(id uuid) where i.id=c.id)) then raise exception 'لا يمكن حذف بند مستخدم في تقديم استلام سابق'; end if;
 delete from public.checklist_items c where c.activity_id=p_activity_id and not exists(select 1 from jsonb_to_recordset(p_items) as i(id uuid) where i.id=c.id);
 for v_item in select * from jsonb_to_recordset(p_items) as i(id uuid,text text,photo_required boolean,"order" integer) loop
  insert into public.checklist_items(id,activity_id,text,photo_required,"order") values(v_item.id,p_activity_id,v_item.text,v_item.photo_required,v_item."order") on conflict(id) do update set text=excluded.text,photo_required=excluded.photo_required,"order"=excluded."order" where public.checklist_items.activity_id=p_activity_id;
  if not found then raise exception 'تعذّر حفظ بند الاستلام'; end if;
 end loop;
end;
$$;
revoke all on function public.save_checklist_atomic(uuid,jsonb) from public,anon;
grant execute on function public.save_checklist_atomic(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';


-- Source: 20261012101733_storage_upload_limits.sql

-- Existing objects remain intact; limits apply to future uploads.
update storage.buckets set file_size_limit=5*1024*1024,allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='company-logos';
update storage.buckets set file_size_limit=2*1024*1024,allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='signatures';
update storage.buckets set file_size_limit=10*1024*1024,allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='checklist-photos';
update storage.buckets set file_size_limit=25*1024*1024,allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp','text/plain','text/csv','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/zip','application/x-zip-compressed'] where id='documents';


-- Source: 20261012102214_lock_contract_workflows.sql

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

-- Source: 20261012102357_reject_anonymous_business_rpcs.sql

-- RLS does not protect SECURITY DEFINER RPCs; reject anonymous identities inside business procedures.
do $rpc_guard$
declare f record; v_definition text; v_updated text;
begin
 for f in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
 where n.nspname='public' and p.prosecdef and l.lanname='plpgsql' and p.prorettype<>'trigger'::regtype
   and p.proname not in ('notify_user','can_manage_department','can_view_audit_entry')
 loop
  v_definition:=pg_get_functiondef(f.oid);
  if v_definition like '%is_anonymous%' then continue; end if;
  v_updated:=regexp_replace(v_definition,'(^|\n)begin[ \t]*\r?\n',E'\nBEGIN\n  IF auth.uid() IS NULL OR coalesce((auth.jwt()->>''is_anonymous'')::boolean,false) THEN RAISE EXCEPTION ''يلزم حساب مسجل'' USING errcode=''42501''; END IF;\n','i');
  if v_updated=v_definition then raise exception 'Cannot locate procedure entry for %',f.proname; end if;
  execute v_updated;
 end loop;
end;
$rpc_guard$;
notify pgrst,'reload schema';


-- Source: 20261012102610_serialize_approval_chain_actions.sql

-- All actions on a chain acquire the same parent lock before reading or changing any step.
do $chain_lock$ declare f record;v_definition text;v_updated text;v_prefix text;v_chain text;v_steps text;
begin
 for f in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
 'review_approval_step','route_approval_step','reroute_approval_step','send_back_approval_step','insert_approval_step',
 'review_internal_approval_step','route_internal_approval_step','reroute_internal_approval_step','send_back_internal_approval_step','insert_internal_approval_step')
 loop
  v_chain:=case when f.proname like '%internal%' then 'internal_approval_chains' else 'approval_chains' end;
  v_steps:=case when f.proname like '%internal%' then 'internal_approval_chain_steps' else 'approval_chain_steps' end;
  v_prefix:=format(E'\nBEGIN\n  IF auth.uid() IS NULL OR coalesce((auth.jwt()->>''is_anonymous'')::boolean,false) THEN RAISE EXCEPTION ''يلزم حساب مسجل'' USING errcode=''42501''; END IF;\n  PERFORM 1 FROM public.%I c WHERE c.id=(SELECT s.chain_id FROM public.%I s WHERE s.id=p_step_id) FOR UPDATE OF c;\n  IF NOT FOUND THEN RAISE EXCEPTION ''خطوة الاعتماد غير موجودة''; END IF;\n',v_chain,v_steps);
  v_definition:=pg_get_functiondef(f.oid);
  v_updated:=regexp_replace(v_definition,'(^|\n)begin[ \t]*\r?\n',v_prefix,'i');
  if v_updated=v_definition then raise exception 'Cannot locate chain action %',f.proname; end if;
  execute v_updated;
 end loop;
end;
$chain_lock$;
notify pgrst,'reload schema';


-- Source: 20261012103753_align_attachment_and_billing_schema.sql

-- Production inventory on 2026-10-12 confirmed there are no material attachment rows to classify.
alter table public.material_request_attachments add column if not exists phase text not null default 'sample' check(phase in ('sample','purchase'));
-- A RETURNS TABLE shape change requires dropping this leaf RPC; do not use CASCADE.
drop function public.list_all_companies_billing();
create function public.list_all_companies_billing()
returns table(id uuid,name text,subscription_status text,trial_ends_at timestamptz,subscription_note text,subscription_updated_at timestamptz,created_at timestamptz,member_count bigint,is_individual boolean)
language sql stable security definer set search_path='' as $$
 select c.id,c.name,c.subscription_status,c.trial_ends_at,c.subscription_note,c.subscription_updated_at,c.created_at,
 (select count(*) from public.profiles p where p.company_id=c.id),c.is_individual
 from public.companies c where public.is_platform_admin() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 order by c.created_at desc;
$$;
revoke all on function public.list_all_companies_billing() from public,anon;
grant execute on function public.list_all_companies_billing() to authenticated,service_role;
notify pgrst,'reload schema';


-- Source: 20261012104825_queue_storage_cleanup.sql

create table app_private.storage_cleanup_queue(
 id uuid primary key default gen_random_uuid(),bucket text not null,path text not null,owner_id text not null,
 company_id uuid not null,queued_at timestamptz not null default now(),locked_until timestamptz,
 attempts integer not null default 0,last_error text,unique(bucket,path)
);
alter table app_private.storage_cleanup_queue enable row level security;
revoke all on app_private.storage_cleanup_queue from public,anon,authenticated;
grant select,insert,update,delete on app_private.storage_cleanup_queue to service_role;

create function app_private.storage_path(p_bucket text,p_stored text)
returns text language plpgsql immutable set search_path='' as $$
declare v_path text:=p_stored;v_marker text:='/object/sign/'||p_bucket||'/';v_index integer;begin
 if v_path is null then return null;end if;
 v_index:=strpos(v_path,v_marker);
 if v_index>0 then v_path:=split_part(substr(v_path,v_index+length(v_marker)),'?',1);end if;
 v_path:=replace(replace(v_path,'%2F','/'),'%2f','/');
 if v_path !~ '^[0-9a-fA-F-]{36}/[a-zA-Z0-9_.-]+$' then return null;end if;
 return v_path;
end;$$;
revoke all on function app_private.storage_path(text,text) from public,anon,authenticated;

create function app_private.storage_reference_exists(p_bucket text,p_path text)
returns boolean language plpgsql security definer set search_path='' as $$
declare c record;v_exists boolean;begin
 for c in select table_name,column_name from information_schema.columns where table_schema='public' and data_type='text' and column_name like '%\_url' escape '\'
 loop
  execute format('select exists(select 1 from public.%I where app_private.storage_path($1,%I)=$2)',c.table_name,c.column_name) into v_exists using p_bucket,p_path;
  if v_exists then return true;end if;
 end loop;
 return false;
end;$$;
revoke all on function app_private.storage_reference_exists(text,text) from public,anon,authenticated;

create function app_private.track_storage_reference()
returns trigger language plpgsql security definer set search_path='' as $$
declare i integer;v_column text;v_bucket text;v_old text;v_new text;v_company uuid;v_owner text;v_locked timestamptz;begin
 for i in 0..tg_nargs-1 loop
  v_column:=split_part(tg_argv[i],':',1);v_bucket:=split_part(tg_argv[i],':',2);
  v_old:=case when tg_op='INSERT' then null else app_private.storage_path(v_bucket,to_jsonb(old)->>v_column) end;
  v_new:=case when tg_op='DELETE' then null else app_private.storage_path(v_bucket,to_jsonb(new)->>v_column) end;
  if v_new is not null then
   select locked_until into v_locked from app_private.storage_cleanup_queue where bucket=v_bucket and path=v_new for update;
   if found then
    if v_locked>clock_timestamp() then raise exception 'الملف قيد التنظيف؛ ارفع نسخة جديدة أو أعد المحاولة لاحقاً';end if;
    delete from app_private.storage_cleanup_queue where bucket=v_bucket and path=v_new;
   end if;
  end if;
  if v_old is not null and v_old is distinct from v_new and auth.uid() is not null then
   v_company:=public.current_company_id();
   select coalesce(o.owner_id,o.owner::text) into v_owner from storage.objects o join public.profiles p on p.id::text=coalesce(o.owner_id,o.owner::text)
    where o.bucket_id=v_bucket and o.name=v_old and p.company_id=v_company;
   if found and v_company is not null then
    insert into app_private.storage_cleanup_queue(bucket,path,owner_id,company_id) values(v_bucket,v_old,v_owner,v_company)
    on conflict(bucket,path) do update set queued_at=now(),locked_until=null,attempts=0,last_error=null;
   end if;
  end if;
 end loop;
 if tg_op='DELETE' then return old;end if;return new;
end;$$;
revoke all on function app_private.track_storage_reference() from public,anon,authenticated;

do $storage_triggers$ declare t record;v_args text;begin
 for t in select distinct table_name from information_schema.columns where table_schema='public' and data_type='text' and column_name like '%\_url' escape '\'
 loop
  select string_agg(quote_literal(column_name||':'||case when column_name='image_url' then 'checklist-photos' when column_name like '%signature_url' then 'signatures' when column_name='logo_url' or column_name like 'print_%_url' then 'company-logos' else 'documents' end),',') into v_args
   from information_schema.columns where table_schema='public' and table_name=t.table_name and data_type='text' and column_name like '%\_url' escape '\';
  execute format('create trigger track_storage_reference before insert or update or delete on public.%I for each row execute function app_private.track_storage_reference(%s)',t.table_name,v_args);
 end loop;
end;$storage_triggers$;

create function public.claim_storage_cleanup(p_limit integer default 20)
returns table(id uuid,bucket text,path text) language plpgsql security definer set search_path='' as $$
declare q app_private.storage_cleanup_queue;v_owner text;v_updated timestamptz;begin
 for q in select * from app_private.storage_cleanup_queue s where (s.locked_until is null or s.locked_until<clock_timestamp()) and s.attempts<10 order by s.queued_at limit greatest(1,least(coalesce(p_limit,20),50)) for update skip locked
 loop
  if app_private.storage_reference_exists(q.bucket,q.path) then delete from app_private.storage_cleanup_queue s where s.id=q.id;continue;end if;
  select coalesce(o.owner_id,o.owner::text),o.updated_at into v_owner,v_updated from storage.objects o where o.bucket_id=q.bucket and o.name=q.path;
  if found and (v_owner is distinct from q.owner_id or v_updated>q.queued_at) then update app_private.storage_cleanup_queue s set attempts=10,last_error='Object ownership or generation changed; manual review required' where s.id=q.id;continue;end if;
  update app_private.storage_cleanup_queue s set locked_until=clock_timestamp()+interval '20 minutes',attempts=s.attempts+1 where s.id=q.id;
  id:=q.id;bucket:=q.bucket;path:=q.path;return next;
 end loop;
end;$$;
revoke all on function public.claim_storage_cleanup(integer) from public,anon,authenticated;
grant execute on function public.claim_storage_cleanup(integer) to service_role;
create function public.finish_storage_cleanup(p_id uuid,p_error text default null)
returns void language plpgsql security definer set search_path='' as $$begin
 if p_error is null then delete from app_private.storage_cleanup_queue where id=p_id;
 else update app_private.storage_cleanup_queue set locked_until=null,last_error=left(p_error,500) where id=p_id;end if;
end;$$;
revoke all on function public.finish_storage_cleanup(uuid,text) from public,anon,authenticated;
grant execute on function public.finish_storage_cleanup(uuid,text) to service_role;
notify pgrst,'reload schema';


-- Source: 20261012105726_validate_storage_references_and_scan_orphans.sql

-- Validate storage references and serialize them with cleanup claims.
create table app_private.storage_orphan_scan_state(id boolean primary key default true check(id),last_object_id uuid,scanned_at timestamptz not null default now());
alter table app_private.storage_orphan_scan_state enable row level security;
revoke all on app_private.storage_orphan_scan_state from public,anon,authenticated;
create function public.enqueue_storage_orphans(p_limit integer default 100,p_min_age_hours integer default 24)
returns integer language plpgsql security definer set search_path='' as $$
declare v_cursor uuid;v_last uuid;v_count integer:=0;v_inserted integer;v_company uuid;v_owner text;o record;
begin
 insert into app_private.storage_orphan_scan_state(id) values(true) on conflict(id) do nothing;
 select last_object_id into v_cursor from app_private.storage_orphan_scan_state where id=true for update;
 for o in select * from storage.objects s where s.bucket_id in ('documents','signatures','checklist-photos','company-logos') and (v_cursor is null or s.id>v_cursor)
  and s.created_at<clock_timestamp()-make_interval(hours=>greatest(24,least(coalesce(p_min_age_hours,24),720))) and s.updated_at<clock_timestamp()-make_interval(hours=>greatest(24,least(coalesce(p_min_age_hours,24),720)))
  order by s.id limit greatest(1,least(coalesce(p_limit,100),500))
 loop
  v_last:=o.id;
  if app_private.storage_path(o.bucket_id,o.name) is null then continue;end if;
  if not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended(o.bucket_id||':'||o.name,0)) then continue;end if;
  v_owner:=coalesce(o.owner_id,o.owner::text,split_part(o.name,'/',1));
  select company_id into v_company from public.profiles where id::text=v_owner;
  if not found or v_company is null or app_private.storage_reference_exists(o.bucket_id,o.name) then continue;end if;
  insert into app_private.storage_cleanup_queue(bucket,path,owner_id,company_id) values(o.bucket_id,o.name,v_owner,v_company) on conflict(bucket,path) do nothing;
  get diagnostics v_inserted=row_count;v_count:=v_count+v_inserted;
 end loop;
 update app_private.storage_orphan_scan_state set last_object_id=v_last,scanned_at=clock_timestamp() where id=true;
 return v_count;
end;$$;
revoke all on function public.enqueue_storage_orphans(integer,integer) from public,anon,authenticated;
grant execute on function public.enqueue_storage_orphans(integer,integer) to service_role;
create or replace function app_private.track_storage_reference()
returns trigger language plpgsql security definer set search_path='' as $$
declare i integer;v_column text;v_bucket text;v_old text;v_new text;v_company uuid;v_owner text;v_locked timestamptz;v_lock text;begin
 for i in 0..tg_nargs-1 loop
  v_column:=split_part(tg_argv[i],':',1);v_bucket:=split_part(tg_argv[i],':',2);
  v_old:=case when tg_op='INSERT' then null else app_private.storage_path(v_bucket,to_jsonb(old)->>v_column) end;
  v_new:=case when tg_op='DELETE' then null else app_private.storage_path(v_bucket,to_jsonb(new)->>v_column) end;
  for v_lock in select distinct value from unnest(array[v_old,v_new]) as value where value is not null order by value loop
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_bucket||':'||v_lock,0));
  end loop;
  if v_new is not null then
   if v_new is distinct from v_old and auth.uid() is not null then
    perform 1 from storage.objects o left join public.profiles p on p.id::text=coalesce(o.owner_id,o.owner::text,split_part(o.name,'/',1)) where o.bucket_id=v_bucket and o.name=v_new and (coalesce(o.owner_id,o.owner::text,split_part(o.name,'/',1))=auth.uid()::text or p.company_id=public.current_company_id());
    if not found then raise exception 'الملف غير موجود أو لا تملك صلاحية الوصول؛ أعد رفع الملف' using errcode='42501';end if;
   end if;
   select locked_until into v_locked from app_private.storage_cleanup_queue where bucket=v_bucket and path=v_new for update;
   if found then
    if v_locked>clock_timestamp() then raise exception 'الملف قيد التنظيف؛ ارفع نسخة جديدة أو أعد المحاولة لاحقاً';end if;
    delete from app_private.storage_cleanup_queue where bucket=v_bucket and path=v_new;
   end if;
  end if;
  if v_old is not null and v_old is distinct from v_new and auth.uid() is not null then
   v_company:=public.current_company_id();
   select coalesce(o.owner_id,o.owner::text,split_part(o.name,'/',1)) into v_owner from storage.objects o join public.profiles p on p.id::text=coalesce(o.owner_id,o.owner::text,split_part(o.name,'/',1))
    where o.bucket_id=v_bucket and o.name=v_old and p.company_id=v_company;
   if found and v_company is not null then
    insert into app_private.storage_cleanup_queue(bucket,path,owner_id,company_id) values(v_bucket,v_old,v_owner,v_company)
    on conflict(bucket,path) do update set queued_at=now(),locked_until=null,attempts=0,last_error=null;
   end if;
  end if;
 end loop;
 if tg_op='DELETE' then return old;end if;return new;
end;$$;

create or replace function public.claim_storage_cleanup(p_limit integer default 20)
returns table(id uuid,bucket text,path text) language plpgsql security definer set search_path='' as $$
declare q app_private.storage_cleanup_queue;v_owner text;v_updated timestamptz;begin
 for q in select * from app_private.storage_cleanup_queue s where (s.locked_until is null or s.locked_until<clock_timestamp()) and s.attempts<10 order by s.queued_at limit greatest(1,least(coalesce(p_limit,20),50)) for update skip locked
 loop
  if not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended(q.bucket||':'||q.path,0)) then continue;end if;
  if app_private.storage_reference_exists(q.bucket,q.path) then delete from app_private.storage_cleanup_queue s where s.id=q.id;continue;end if;
  select coalesce(o.owner_id,o.owner::text,split_part(o.name,'/',1)),o.updated_at into v_owner,v_updated from storage.objects o where o.bucket_id=q.bucket and o.name=q.path;
  if found and (v_owner is distinct from q.owner_id or v_updated>q.queued_at) then update app_private.storage_cleanup_queue s set attempts=10,last_error='Object ownership or generation changed; manual review required' where s.id=q.id;continue;end if;
  update app_private.storage_cleanup_queue s set locked_until=clock_timestamp()+interval '20 minutes',attempts=s.attempts+1 where s.id=q.id;
  id:=q.id;bucket:=q.bucket;path:=q.path;return next;
 end loop;
end;$$;


-- Source: 20261012121334_guard_authenticated_policies.sql

-- Anonymous sign-ins also use authenticated. A restrictive policy combines with
-- every existing permissive policy, including those already scoped to authenticated.
DO $guard$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT n.nspname, c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p') AND c.relrowsecurity
      AND (n.nspname = 'public' OR (n.nspname = 'storage' AND c.relname = 'objects'))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS require_permanent_account ON %I.%I', target.nspname, target.relname);
    EXECUTE format(
      'CREATE POLICY require_permanent_account ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated '
      'USING (auth.uid() IS NOT NULL AND NOT coalesce((auth.jwt()->>''is_anonymous'')::boolean, false)) '
      'WITH CHECK (auth.uid() IS NOT NULL AND NOT coalesce((auth.jwt()->>''is_anonymous'')::boolean, false))',
      target.nspname, target.relname);
  END LOOP;
END;
$guard$;
NOTIFY pgrst, 'reload schema';


-- Source: 20261012132304_lock_material_submissions.sql

-- Read the workflow state under a request-row lock before creating an approval chain.
DO $lock_requests$
DECLARE f record; definition text; updated text; found_count integer := 0;
BEGIN
  FOR f IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('submit_material_sourcing','submit_material_purchase_chain')
  LOOP
    found_count := found_count + 1;
    definition := pg_get_functiondef(f.oid);
    updated := replace(definition,
      'from public.material_requests where id = p_request_id;',
      'from public.material_requests where id = p_request_id for update;');
    IF updated=definition AND definition NOT LIKE '%where id = p_request_id for update;%' THEN
      RAISE EXCEPTION 'Cannot find material request lock anchor in %',f.proname;
    END IF;
    EXECUTE updated;
  END LOOP;
  IF found_count<>2 THEN RAISE EXCEPTION 'Expected both material submission procedures'; END IF;
END;
$lock_requests$;
NOTIFY pgrst,'reload schema';


COMMIT;
