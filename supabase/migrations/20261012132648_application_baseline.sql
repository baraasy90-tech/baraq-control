-- Reconstructed application schema, captured 2026-10-12. NOT a data backup.

-- Apply only to a fresh isolated Supabase database; never to existing production.

BEGIN;

SET search_path = public, extensions;

SET check_function_bodies = false;

CREATE TABLE public."activities" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "parent_id" uuid,
  "name" text NOT NULL,
  "order" integer NOT NULL,
  "duration_days" integer NOT NULL,
  "done" boolean NOT NULL,
  "start_date" date,
  "calendar_type" text NOT NULL,
  "depends_on" uuid,
  "dep_type" text,
  "lag_days" integer NOT NULL,
  "lag_unit" text NOT NULL,
  "critical" boolean NOT NULL,
  "alert_lead_days" integer NOT NULL,
  "requires_receiving" boolean NOT NULL,
  "scope_type" text NOT NULL,
  "scope_ref" text,
  "template_group_id" uuid,
  "budget_type" text,
  "planned_amount" numeric,
  "boq_qty" numeric,
  "boq_unit" text,
  "boq_unit_price" numeric,
  "created_at" timestamp with time zone NOT NULL,
  "custom_calendar_id" uuid,
  "assigned_to" uuid,
  "code" text,
  "actual_start_date" date,
  "actual_end_date" date,
  "linked_contract_id" uuid
);

CREATE TABLE public."approval_chain_steps" (
  "id" uuid NOT NULL,
  "chain_id" uuid NOT NULL,
  "step_order" integer NOT NULL,
  "department_id" uuid,
  "assigned_user_id" uuid,
  "status" text NOT NULL,
  "routed_by" uuid,
  "routed_at" timestamp with time zone,
  "acted_by" uuid,
  "acted_at" timestamp with time zone,
  "note" text,
  "inserted_by" uuid,
  "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."approval_chain_template_steps" (
  "id" uuid NOT NULL,
  "template_id" uuid NOT NULL,
  "step_order" integer NOT NULL,
  "department_id" uuid,
  "assigned_user_id" uuid
);

CREATE TABLE public."approval_chain_templates" (
  "id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "name" text NOT NULL,
  "chain_type" text NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."approval_chains" (
  "id" uuid NOT NULL,
  "material_request_id" uuid NOT NULL,
  "phase" text NOT NULL,
  "status" text NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone NOT NULL,
  "decided_at" timestamp with time zone,
  "requester_note" text,
  "chain_type" text NOT NULL
);

CREATE TABLE public."audit_log" (
  "id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "table_name" text NOT NULL,
  "record_id" uuid NOT NULL,
  "action" text NOT NULL,
  "actor_id" uuid,
  "old_data" jsonb,
  "new_data" jsonb,
  "created_at" timestamp with time zone NOT NULL,
  "project_id" uuid
);

CREATE TABLE public."budget_actual_entries" (
  "id" uuid NOT NULL,
  "activity_id" uuid NOT NULL,
  "date" date NOT NULL,
  "amount" numeric NOT NULL,
  "source" text NOT NULL,
  "note" text,
  "contract_ref" text,
  "contract_payment_id" uuid,
  "status" text NOT NULL,
  "submitted_by" uuid,
  "submitted_at" timestamp with time zone,
  "pm_reviewed_by" uuid,
  "pm_reviewed_at" timestamp with time zone,
  "pm_review_note" text,
  "finance_reviewed_by" uuid,
  "finance_reviewed_at" timestamp with time zone,
  "finance_review_note" text
);

CREATE TABLE public."budget_reconciliation_notes" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "contract_value" numeric,
  "tracked_budget_value" numeric,
  "note" text NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "status" text NOT NULL,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "review_note" text,
  "kind" text NOT NULL
);

CREATE TABLE public."checklist_items" (
  "id" uuid NOT NULL,
  "activity_id" uuid NOT NULL,
  "text" text NOT NULL,
  "photo_required" boolean NOT NULL,
  "order" integer NOT NULL
);

CREATE TABLE public."checklist_results" (
  "id" uuid NOT NULL,
  "submission_id" uuid NOT NULL,
  "checklist_item_id" uuid,
  "checked" boolean NOT NULL,
  "image_url" text
);

CREATE TABLE public."companies" (
  "id" uuid NOT NULL,
  "name" text NOT NULL,
  "logo_url" text,
  "archive_folder_name" text NOT NULL,
  "archive_storage_type" text NOT NULL,
  "archive_local_path" text,
  "created_at" timestamp with time zone NOT NULL,
  "created_by" uuid,
  "print_mode" text NOT NULL,
  "print_header_url" text,
  "print_footer_url" text,
  "print_full_page_url" text,
  "print_margin_top" numeric NOT NULL,
  "print_margin_bottom" numeric NOT NULL,
  "print_margin_left" numeric NOT NULL,
  "print_margin_right" numeric NOT NULL,
  "header_color" text NOT NULL,
  "company_code" text NOT NULL,
  "country_code" text NOT NULL,
  "company_code_expires_at" timestamp with time zone,
  "subscription_status" text NOT NULL,
  "trial_ends_at" timestamp with time zone NOT NULL,
  "subscription_note" text,
  "subscription_updated_by" uuid,
  "subscription_updated_at" timestamp with time zone,
  "vat_rate" numeric NOT NULL,
  "is_individual" boolean NOT NULL
);

CREATE TABLE public."company_holidays" (
  "id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "name" text NOT NULL,
  "holiday_date" date NOT NULL,
  "recurring_yearly" boolean NOT NULL,
  "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."contract_deductions" (
  "id" uuid NOT NULL,
  "contract_id" uuid NOT NULL,
  "violation_name" text NOT NULL,
  "deduction_amount" numeric NOT NULL,
  "damage_description" text,
  "deducted_at" date NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."contract_extra_works" (
  "id" uuid NOT NULL,
  "contract_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "amount" numeric NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone NOT NULL,
  "status" text NOT NULL,
  "submitted_by" uuid,
  "submitted_at" timestamp with time zone,
  "pm_reviewed_by" uuid,
  "pm_reviewed_at" timestamp with time zone,
  "pm_review_note" text,
  "finance_reviewed_by" uuid,
  "finance_reviewed_at" timestamp with time zone,
  "finance_review_note" text
);

CREATE TABLE public."contract_line_items" (
  "id" uuid NOT NULL,
  "contract_id" uuid NOT NULL,
  "description" text NOT NULL,
  "quantity" numeric,
  "unit" text,
  "unit_price" numeric,
  "order" integer NOT NULL
);

CREATE TABLE public."contract_payments" (
  "id" uuid NOT NULL,
  "contract_id" uuid NOT NULL,
  "title" text NOT NULL,
  "due_date" date,
  "amount" numeric,
  "percentage" numeric,
  "paid" boolean NOT NULL,
  "guarantee_note" text,
  "order" integer NOT NULL,
  "is_advance_payment" boolean NOT NULL,
  "status" text NOT NULL,
  "submitted_by" uuid,
  "submitted_at" timestamp with time zone,
  "pm_reviewed_by" uuid,
  "pm_reviewed_at" timestamp with time zone,
  "pm_review_note" text,
  "finance_reviewed_by" uuid,
  "finance_reviewed_at" timestamp with time zone,
  "finance_review_note" text
);

CREATE TABLE public."contracts" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "pdf_url" text,
  "start_date" date,
  "duration_days" integer,
  "total_value" numeric,
  "payment_terms" text,
  "has_advance_payment" boolean NOT NULL,
  "advance_payment_percentage" numeric,
  "advance_payment_guarantee_note" text,
  "advance_deduction_percentage" numeric,
  "retention_percentage" numeric,
  "retention_released" boolean NOT NULL,
  "retention_release_note" text,
  "created_at" timestamp with time zone NOT NULL,
  "contract_name" text NOT NULL,
  "status" text NOT NULL,
  "submitted_by" uuid,
  "submitted_at" timestamp with time zone,
  "pm_reviewed_by" uuid,
  "pm_reviewed_at" timestamp with time zone,
  "pm_review_note" text,
  "finance_reviewed_by" uuid,
  "finance_reviewed_at" timestamp with time zone,
  "finance_review_note" text,
  "settlement_status" text NOT NULL,
  "settlement_note" text,
  "settlement_submitted_by" uuid,
  "settlement_submitted_at" timestamp with time zone,
  "settlement_pm_reviewed_by" uuid,
  "settlement_pm_reviewed_at" timestamp with time zone,
  "settlement_pm_review_note" text,
  "settlement_finance_reviewed_by" uuid,
  "settlement_finance_reviewed_at" timestamp with time zone,
  "settlement_finance_review_note" text,
  "settled_at" timestamp with time zone,
  "vat_inclusive" boolean NOT NULL,
  "vat_rate" numeric
);

CREATE TABLE public."custom_calendars" (
  "id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "name" text NOT NULL,
  "working_weekdays" integer[] NOT NULL,
  "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."department_members" (
  "id" uuid NOT NULL,
  "department_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "title" text,
  "organizational_level_id" uuid,
  "organizational_classification_id" uuid,
  "job_title_id" uuid,
  "employee_id" uuid
);

CREATE TABLE public."departments" (
  "id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "head_label" text,
  "member_label" text,
  "parent_department_id" uuid,
  "position_x" numeric,
  "position_y" numeric
);

CREATE TABLE public."document_folders" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "parent_folder_id" uuid,
  "name" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."documents" (
  "id" uuid NOT NULL,
  "folder_id" uuid NOT NULL,
  "name" text NOT NULL,
  "file_url" text NOT NULL,
  "uploaded_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."employees" (
  "id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "department_id" uuid,
  "full_name" text NOT NULL,
  "email" text,
  "phone" text,
  "user_id" uuid,
  "organizational_level_id" uuid,
  "organizational_classification_id" uuid,
  "job_title_id" uuid,
  "direct_manager_employee_id" uuid,
  "status" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."internal_approval_chain_steps" (
  "id" uuid NOT NULL,
  "chain_id" uuid NOT NULL,
  "step_order" integer NOT NULL,
  "department_id" uuid,
  "assigned_user_id" uuid,
  "status" text NOT NULL,
  "routed_by" uuid,
  "routed_at" timestamp with time zone,
  "acted_by" uuid,
  "acted_at" timestamp with time zone,
  "note" text,
  "inserted_by" uuid,
  "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."internal_approval_chains" (
  "id" uuid NOT NULL,
  "internal_request_id" uuid NOT NULL,
  "chain_type" text NOT NULL,
  "status" text NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone NOT NULL,
  "decided_at" timestamp with time zone,
  "requester_note" text
);

CREATE TABLE public."internal_request_attachment_revisions" (
  "id" uuid NOT NULL,
  "attachment_id" uuid NOT NULL,
  "revision_number" integer NOT NULL,
  "file_url" text NOT NULL,
  "uploaded_by" uuid,
  "uploaded_at" timestamp with time zone NOT NULL,
  "note" text
);

CREATE TABLE public."internal_request_attachments" (
  "id" uuid NOT NULL,
  "request_id" uuid NOT NULL,
  "file_name" text NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."internal_requests" (
  "id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "type" text,
  "title" text NOT NULL,
  "description" text,
  "start_date" date,
  "end_date" date,
  "status" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."invites" (
  "id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "department_id" uuid NOT NULL,
  "role" text NOT NULL,
  "email" text NOT NULL,
  "token" text NOT NULL,
  "invited_by" uuid NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "expires_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."job_titles" (
  "id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."material_request_attachments" (
  "id" uuid NOT NULL,
  "material_request_id" uuid NOT NULL,
  "option_id" uuid,
  "file_url" text NOT NULL,
  "file_name" text NOT NULL,
  "uploaded_by" uuid,
  "uploaded_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."material_request_options" (
  "id" uuid NOT NULL,
  "material_request_id" uuid NOT NULL,
  "description" text NOT NULL,
  "price" numeric,
  "created_by" uuid,
  "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."material_requests" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "item_name" text NOT NULL,
  "description" text,
  "created_by" uuid,
  "created_at" timestamp with time zone NOT NULL,
  "status" text NOT NULL,
  "attachments_note" text,
  "quote_price" numeric,
  "quote_received_at" date,
  "quantity" numeric,
  "target_unit_price" numeric,
  "needed_by" date
);

CREATE TABLE public."notifications" (
  "id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "title" text NOT NULL,
  "body" text,
  "link" text,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."organizational_classifications" (
  "id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."organizational_levels" (
  "id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "name" text NOT NULL,
  "order_index" integer NOT NULL,
  "is_management_level" boolean NOT NULL,
  "is_employee_level" boolean NOT NULL,
  "is_worker_level" boolean NOT NULL,
  "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."platform_admins" (
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."profiles" (
  "id" uuid NOT NULL,
  "full_name" text NOT NULL,
  "company_id" uuid,
  "created_at" timestamp with time zone NOT NULL,
  "signature_url" text
);

CREATE TABLE public."project_members" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."projects" (
  "id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "name" text NOT NULL,
  "manager_name" text NOT NULL,
  "location" text NOT NULL,
  "map_link" text NOT NULL,
  "area" text NOT NULL,
  "units_count" text NOT NULL,
  "project_type" text NOT NULL,
  "manager_signature_url" text,
  "theme_color" text NOT NULL,
  "theme_icon" text NOT NULL,
  "scope_config" jsonb,
  "created_at" timestamp with time zone NOT NULL,
  "status" text NOT NULL,
  "department_id" uuid,
  "procurement_department_id" uuid
);

CREATE TABLE public."submission_images" (
  "id" uuid NOT NULL,
  "submission_id" uuid NOT NULL,
  "image_url" text NOT NULL
);

CREATE TABLE public."submissions" (
  "id" uuid NOT NULL,
  "activity_id" uuid NOT NULL,
  "manager_name" text NOT NULL,
  "manager_signature_url" text,
  "decision" text NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE public."tasks" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "status" text NOT NULL,
  "priority" text NOT NULL,
  "due_date" date,
  "assigned_to" uuid,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "completed_at" timestamp with time zone
);

CREATE OR REPLACE FUNCTION public.accept_invite(p_token text)
 RETURNS TABLE(result_company_id uuid, result_company_name text, result_department_id uuid, result_role text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_invite record;
begin
  select * into v_invite from public.invites where token = p_token and status = 'pending' and expires_at > now();
  if not found then
    raise exception 'رابط الدعوة غير صالح أو منتهي الصلاحية';
  end if;

  if lower(v_invite.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'هذه الدعوة مرسلة لبريد إلكتروني مختلف عن حسابك الحالي';
  end if;

  update public.profiles set company_id = v_invite.company_id where id = auth.uid();

  insert into public.department_members (department_id, user_id, role)
  values (v_invite.department_id, auth.uid(), v_invite.role)
  on conflict (department_id, user_id) do update set role = excluded.role;

  update public.invites set status = 'accepted' where id = v_invite.id;

  return query select c.id, c.name, v_invite.department_id, v_invite.role from public.companies c where c.id = v_invite.company_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.add_internal_request_attachment(p_request_id uuid, p_file_name text, p_file_url text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_attachment_id uuid;
begin
  if not public.can_view_internal_request(p_request_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا الطلب';
  end if;
  if p_file_name is null or trim(p_file_name) = '' or p_file_url is null or trim(p_file_url) = '' then
    raise exception 'لازم اسم ورابط الملف';
  end if;

  insert into public.internal_request_attachments (request_id, file_name, created_by)
  values (p_request_id, trim(p_file_name), auth.uid())
  returning id into v_attachment_id;

  insert into public.internal_request_attachment_revisions (attachment_id, revision_number, file_url, uploaded_by)
  values (v_attachment_id, 1, p_file_url, auth.uid());

  return v_attachment_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.add_internal_request_attachment_revision(p_attachment_id uuid, p_file_url text, p_note text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_request_id uuid;
  v_next_revision integer;
  v_revision_id uuid;
begin
  select request_id into v_request_id from public.internal_request_attachments where id = p_attachment_id;
  if v_request_id is null then
    raise exception 'المرفق غير موجود';
  end if;
  if not public.can_view_internal_request(v_request_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا الطلب';
  end if;
  if p_file_url is null or trim(p_file_url) = '' then
    raise exception 'لازم رابط الملف';
  end if;

  select coalesce(max(revision_number), 0) + 1 into v_next_revision
  from public.internal_request_attachment_revisions where attachment_id = p_attachment_id;

  insert into public.internal_request_attachment_revisions (attachment_id, revision_number, file_url, uploaded_by, note)
  values (p_attachment_id, v_next_revision, p_file_url, auth.uid(), p_note)
  returning id into v_revision_id;

  return v_revision_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.audit_budget_actual_entries()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
  v_project_id uuid;
begin
  select p.id, p.company_id into v_project_id, v_company_id
  from public.activities a join public.projects p on p.id = a.project_id
  where a.id = coalesce(new.activity_id, old.activity_id);
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, v_project_id, 'budget_actual_entries', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.audit_contract_deductions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
  v_project_id uuid;
begin
  select p.id, p.company_id into v_project_id, v_company_id
  from public.contracts c join public.projects p on p.id = c.project_id
  where c.id = coalesce(new.contract_id, old.contract_id);
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, v_project_id, 'contract_deductions', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.audit_contract_extra_works()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
  v_project_id uuid;
begin
  select p.id, p.company_id into v_project_id, v_company_id
  from public.contracts c join public.projects p on p.id = c.project_id
  where c.id = coalesce(new.contract_id, old.contract_id);
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, v_project_id, 'contract_extra_works', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.audit_contract_payments()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
  v_project_id uuid;
begin
  select p.id, p.company_id into v_project_id, v_company_id
  from public.contracts c join public.projects p on p.id = c.project_id
  where c.id = coalesce(new.contract_id, old.contract_id);
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, v_project_id, 'contract_payments', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.audit_contracts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
  v_project_id uuid;
begin
  v_project_id := coalesce(new.project_id, old.project_id);
  select p.company_id into v_company_id from public.projects p where p.id = v_project_id;
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, v_project_id, 'contracts', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.audit_employees()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    coalesce(new.company_id, old.company_id), 'employees', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.audit_internal_approval_chain_steps()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
begin
  select r.company_id into v_company_id
  from public.internal_approval_chains ac join public.internal_requests r on r.id = ac.internal_request_id
  where ac.id = coalesce(new.chain_id, old.chain_id);
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, 'internal_approval_chain_steps', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.audit_internal_approval_chains()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
begin
  select company_id into v_company_id from public.internal_requests where id = coalesce(new.internal_request_id, old.internal_request_id);
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, 'internal_approval_chains', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.audit_internal_request_attachment_revisions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
begin
  select r.company_id into v_company_id
  from public.internal_request_attachments a join public.internal_requests r on r.id = a.request_id
  where a.id = coalesce(new.attachment_id, old.attachment_id);
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, 'internal_request_attachment_revisions', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.audit_internal_request_attachments()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
begin
  select company_id into v_company_id from public.internal_requests where id = coalesce(new.request_id, old.request_id);
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, 'internal_request_attachments', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.audit_internal_requests()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    coalesce(new.company_id, old.company_id), null, 'internal_requests', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.audit_material_requests()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
  v_project_id uuid;
begin
  v_project_id := coalesce(new.project_id, old.project_id);
  select p.company_id into v_company_id from public.projects p where p.id = v_project_id;
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, v_project_id, 'material_requests', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
    and (
      public.is_company_owner(p.company_id)
      or public.is_executive(p.company_id)
      or exists (
        select 1 from public.department_members dm
        where dm.department_id = p.department_id and dm.user_id = auth.uid() and dm.role = 'head'
      )
      or exists (
        select 1 from public.project_members pm
        where pm.project_id = p.id and pm.user_id = auth.uid()
      )
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_approve_budget_variance(p_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    public.can_manage_org((select company_id from public.projects where id = p_project_id))
    or exists (
      select 1
      from public.department_members dm
      join public.departments d on d.id = dm.department_id
      where dm.user_id = auth.uid()
        and d.type = 'finance'
        and d.company_id = (select company_id from public.projects where id = p_project_id)
    );
$function$;

CREATE OR REPLACE FUNCTION public.can_executive_approve(p_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.is_department_head_of_type(p_project_id, 'executive');
$function$;

CREATE OR REPLACE FUNCTION public.can_finance_approve(p_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.is_department_head_of_type(p_project_id, 'finance');
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_department(p_department_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
  v_current_id uuid;
begin
  select company_id into v_company_id from public.departments where id = p_department_id;
  if v_company_id is null then
    return false;
  end if;

  if public.can_manage_org(v_company_id) then
    return true;
  end if;

  v_current_id := p_department_id;
  while v_current_id is not null loop
    if exists (
      select 1 from public.department_members dm
      where dm.department_id = v_current_id and dm.user_id = auth.uid() and dm.role = 'head'
    ) then
      return true;
    end if;
    select parent_department_id into v_current_id from public.departments where id = v_current_id;
  end loop;

  return false;
end;
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_org(p_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.is_company_owner(p_company_id) or public.is_executive(p_company_id);
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_project(p_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
    and (
      public.is_company_owner(p.company_id)
      or public.is_executive(p.company_id)
      or exists (
        select 1 from public.department_members dm
        where dm.department_id = p.department_id and dm.user_id = auth.uid() and dm.role = 'head'
      )
      or exists (
        select 1 from public.project_members pm
        where pm.project_id = p.id and pm.user_id = auth.uid() and pm.role = 'manager'
      )
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_pm_approve(p_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.is_department_head_of_type(p_project_id, 'project_management');
$function$;

CREATE OR REPLACE FUNCTION public.can_view_audit_entry(p_table_name text, p_record_id uuid, p_company_id uuid, p_project_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if public.can_manage_org(p_company_id) then
    return true;
  end if;
  if p_project_id is not null and public.can_access_project(p_project_id) then
    return true;
  end if;
  if p_table_name in ('internal_requests', 'internal_approval_chains', 'internal_approval_chain_steps', 'internal_request_attachments', 'internal_request_attachment_revisions') then
    return exists (
      select 1 from public.internal_requests ir
      where (
        (p_table_name = 'internal_requests' and ir.id = p_record_id)
        or (p_table_name = 'internal_approval_chains' and ir.id = (select internal_request_id from public.internal_approval_chains where id = p_record_id))
        or (p_table_name = 'internal_approval_chain_steps' and ir.id = (
              select ac.internal_request_id from public.internal_approval_chain_steps s
              join public.internal_approval_chains ac on ac.id = s.chain_id where s.id = p_record_id))
        or (p_table_name = 'internal_request_attachments' and ir.id = (select request_id from public.internal_request_attachments where id = p_record_id))
        or (p_table_name = 'internal_request_attachment_revisions' and ir.id = (
              select a.request_id from public.internal_request_attachment_revisions rev
              join public.internal_request_attachments a on a.id = rev.attachment_id where rev.id = p_record_id))
      )
      and public.can_view_internal_request(ir.id)
    );
  end if;
  return false;
end;
$function$;

CREATE OR REPLACE FUNCTION public.can_view_internal_request(p_request_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    exists (select 1 from public.internal_requests r where r.id = p_request_id and r.user_id = auth.uid())
    or public.can_manage_org((select company_id from public.internal_requests where id = p_request_id))
    or exists (
      select 1
      from public.internal_approval_chains ac
      join public.internal_approval_chain_steps s on s.chain_id = ac.id
      where ac.internal_request_id = p_request_id
        and (
          s.assigned_user_id = auth.uid()
          or (s.department_id is not null and public.is_department_head(s.department_id))
        )
    );
$function$;

CREATE OR REPLACE FUNCTION public.create_approval_chain_template(p_name text, p_chain_type text, p_steps jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
  v_template_id uuid;
  v_step jsonb;
  v_order integer := 0;
begin
  select company_id into v_company_id from public.profiles where id = auth.uid();
  if v_company_id is null then
    raise exception 'لا تنتمي لأي شركة';
  end if;
  if p_name is null or trim(p_name) = '' then
    raise exception 'لازم اسم للقالب';
  end if;
  if p_steps is null or jsonb_array_length(p_steps) = 0 then
    raise exception 'لازم خطوة اعتماد واحدة على الأقل';
  end if;

  insert into public.approval_chain_templates (company_id, name, chain_type, created_by)
  values (v_company_id, trim(p_name), coalesce(p_chain_type, 'linear'), auth.uid())
  returning id into v_template_id;

  for v_step in select * from jsonb_array_elements(p_steps) loop
    v_order := v_order + 1;
    insert into public.approval_chain_template_steps (template_id, step_order, department_id, assigned_user_id)
    values (v_template_id, v_order, nullif(v_step->>'department_id', '')::uuid, nullif(v_step->>'user_id', '')::uuid);
  end loop;

  return v_template_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_company(p_name text, p_logo_url text, p_archive_folder_name text, p_archive_storage_type text, p_archive_local_path text)
 RETURNS companies
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company public.companies;
begin
  if auth.uid() is null then
    raise exception 'يلزم تسجيل الدخول';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and company_id is not null) then
    raise exception 'لديك شركة بالفعل';
  end if;

  insert into public.companies (name, logo_url, archive_folder_name, archive_storage_type, archive_local_path)
  values (p_name, p_logo_url, p_archive_folder_name, p_archive_storage_type, p_archive_local_path)
  returning * into v_company;

  update public.profiles set company_id = v_company.id where id = auth.uid();

  return v_company;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_individual_account(p_full_name text)
 RETURNS companies
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company public.companies;
begin
  if auth.uid() is null then
    raise exception 'يلزم تسجيل الدخول';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and company_id is not null) then
    raise exception 'لديك حساب بالفعل';
  end if;

  insert into public.companies (name, is_individual, archive_folder_name, archive_storage_type)
  values (
    'مساحة ' || coalesce(nullif(trim(p_full_name), ''), 'شخصية') || ' الخاصة',
    true, 'أرشيفي', 'cloud'
  )
  returning * into v_company;

  update public.profiles set company_id = v_company.id where id = auth.uid();

  return v_company;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_internal_request(p_type text, p_title text, p_description text, p_start_date date, p_end_date date, p_chain_type text, p_steps jsonb, p_note text, p_template_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
  v_request_id uuid;
  v_chain_id uuid;
  v_chain_type text;
  v_steps jsonb;
  v_step jsonb;
  v_order integer := 0;
  v_first_user uuid;
begin
  select company_id into v_company_id from public.profiles where id = auth.uid();
  if v_company_id is null then
    raise exception 'لا تنتمي لأي شركة';
  end if;
  if p_title is null or trim(p_title) = '' then
    raise exception 'لازم عنوان للطلب';
  end if;

  if p_template_id is not null then
    select chain_type into v_chain_type from public.approval_chain_templates
    where id = p_template_id and company_id = v_company_id;
    if v_chain_type is null then
      raise exception 'القالب غير موجود';
    end if;
    select jsonb_agg(jsonb_build_object('department_id', department_id, 'user_id', assigned_user_id) order by step_order)
    into v_steps
    from public.approval_chain_template_steps where template_id = p_template_id;
  else
    v_chain_type := coalesce(p_chain_type, 'linear');
    v_steps := p_steps;
  end if;

  if v_chain_type not in ('linear', 'network') then
    raise exception 'نوع سلسلة غير صالح';
  end if;
  if v_steps is null or jsonb_array_length(v_steps) = 0 then
    raise exception 'لازم تحديد جهة اعتماد واحدة على الأقل';
  end if;

  insert into public.internal_requests (company_id, user_id, type, title, description, start_date, end_date, status)
  values (
    v_company_id, auth.uid(), p_type, trim(p_title), nullif(trim(coalesce(p_description, '')), ''),
    p_start_date, p_end_date, 'pending'
  )
  returning id into v_request_id;

  insert into public.internal_approval_chains (internal_request_id, chain_type, created_by, requester_note)
  values (v_request_id, v_chain_type, auth.uid(), p_note)
  returning id into v_chain_id;

  for v_step in select * from jsonb_array_elements(v_steps) loop
    v_order := v_order + 1;
    insert into public.internal_approval_chain_steps (chain_id, step_order, department_id, assigned_user_id)
    values (v_chain_id, v_order, nullif(v_step->>'department_id', '')::uuid, nullif(v_step->>'user_id', '')::uuid);

    if v_order = 1 then
      v_first_user := nullif(v_step->>'user_id', '')::uuid;
    end if;
  end loop;

  if v_first_user is not null then
    perform public.notify_user(
      v_company_id, v_first_user, 'طلب جديد بانتظار اعتمادك',
      trim(p_title), '/my-requests'
    );
  end if;

  return v_request_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.current_company_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select company_id from public.profiles where id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.delete_approval_chain_template(p_template_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
  v_created_by uuid;
begin
  select company_id, created_by into v_company_id, v_created_by
  from public.approval_chain_templates where id = p_template_id;
  if v_company_id is null then
    raise exception 'القالب غير موجود';
  end if;
  if v_created_by <> auth.uid() and not public.can_manage_org(v_company_id) then
    raise exception 'لا تملك صلاحية حذف هذا القالب';
  end if;
  delete from public.approval_chain_templates where id = p_template_id;
end;
$function$;

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
  select project_id, status into v_project_id, v_status from public.contracts where id = p_contract_id;

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

CREATE OR REPLACE FUNCTION public.delete_internal_request(p_request_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_company_id uuid;
begin
  select user_id, company_id into v_user_id, v_company_id
  from public.internal_requests where id = p_request_id;

  if v_user_id is null then
    raise exception 'الطلب غير موجود';
  end if;
  if v_user_id <> auth.uid() and not public.can_manage_org(v_company_id) then
    raise exception 'لا تملك صلاحية حذف هذا الطلب';
  end if;

  delete from public.internal_requests where id = p_request_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.generate_company_code()
 RETURNS text
 LANGUAGE sql
AS $function$
  select upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));
$function$;

CREATE OR REPLACE FUNCTION public.guard_budget_entry_value_freeze()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if current_setting('app.bypass_workflow_guard', true) = 'on' then
    return new;
  end if;
  if old.status <> 'draft' and (
       new.amount is distinct from old.amount
    or new.date is distinct from old.date
    or new.activity_id is distinct from old.activity_id
    or new.source is distinct from old.source
    or new.contract_ref is distinct from old.contract_ref
    or new.contract_payment_id is distinct from old.contract_payment_id
  ) then
    raise exception 'لا يمكن تعديل تفاصيل الدفعة الفعلية بعد رفعها للاعتماد؛ أعدها للمسودة أولاً';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_contract_value_freeze()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if current_setting('app.bypass_workflow_guard', true) = 'on' then
    return new;
  end if;
  if old.status <> 'draft' and (
       new.total_value is distinct from old.total_value
    or new.vat_inclusive is distinct from old.vat_inclusive
    or new.vat_rate is distinct from old.vat_rate
  ) then
    raise exception 'لا يمكن تعديل قيمة العقد بعد رفعها للاعتماد؛ أعد العقد للمسودة أولاً';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_extra_work_value_freeze()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if current_setting('app.bypass_workflow_guard', true) = 'on' then
    return new;
  end if;
  if old.status <> 'draft' and new.amount is distinct from old.amount then
    raise exception 'لا يمكن تعديل قيمة البند الإضافي بعد رفعه للاعتماد';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_material_value_freeze()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if current_setting('app.bypass_workflow_guard', true) = 'on' then
    return new;
  end if;
  if old.status not in ('sample_approved', 'purchase_rejected') and new.quote_price is distinct from old.quote_price then
    raise exception 'لا يمكن تعديل سعر عرض الشراء بعد رفعه للاعتماد';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_payment_value_freeze()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if current_setting('app.bypass_workflow_guard', true) = 'on' then
    return new;
  end if;
  if old.status <> 'pending' and (
       new.amount is distinct from old.amount
    or new.percentage is distinct from old.percentage
  ) then
    raise exception 'لا يمكن تعديل قيمة الدفعة بعد رفعها للاعتماد';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_protected_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  col text;
begin
  if current_setting('app.bypass_workflow_guard', true) = 'on' then
    return new;
  end if;
  foreach col in array tg_argv loop
    if (to_jsonb(new) -> col) is distinct from (to_jsonb(old) -> col) then
      raise exception 'العمود "%" محمي ولا يمكن تعديله إلا عبر إجراء الاعتماد الرسمي', col;
    end if;
  end loop;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_company()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  pm_dept_id uuid;
  exec_dept_id uuid;
begin
  insert into public.departments (company_id, name, type) values (new.id, 'إدارة المشاريع', 'project_management')
    returning id into pm_dept_id;
  insert into public.departments (company_id, name, type) values (new.id, 'مدير الحساب', 'executive')
    returning id into exec_dept_id;

  insert into public.department_members (department_id, user_id, role) values (pm_dept_id, new.created_by, 'head');
  insert into public.department_members (department_id, user_id, role) values (exec_dept_id, new.created_by, 'head');

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_project()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.department_id is null then
    select id into new.department_id
    from public.departments
    where company_id = new.company_id and type = 'project_management'
    limit 1;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.insert_approval_step(p_step_id uuid, p_department_id uuid, p_user_id uuid, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_assigned_user_id uuid;
  v_step_status text;
  v_chain_status text;
  v_company_id uuid;
begin
  select acs.chain_id, acs.step_order, acs.assigned_user_id, acs.status
  into v_chain_id, v_step_order, v_assigned_user_id, v_step_status
  from public.approval_chain_steps acs where acs.id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;
  select ac.status, p.company_id into v_chain_status, v_company_id
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
  if (v_assigned_user_id is null or v_assigned_user_id <> auth.uid()) and not public.can_manage_org(v_company_id) then
    raise exception 'فقط الشخص المطلوب اعتماده بهذه المرحلة يقدر يضيف معتمداً إضافياً قبله';
  end if;
  if p_department_id is null and p_user_id is null then
    raise exception 'لازم تحديد قسم أو شخص للمعتمد الإضافي';
  end if;

  update public.approval_chain_steps
  set step_order = step_order + 1
  where chain_id = v_chain_id and step_order >= v_step_order;

  insert into public.approval_chain_steps (chain_id, step_order, department_id, assigned_user_id, inserted_by, note)
  values (v_chain_id, v_step_order, p_department_id, p_user_id, auth.uid(), p_note);
end;
$function$;

CREATE OR REPLACE FUNCTION public.insert_internal_approval_step(p_step_id uuid, p_department_id uuid, p_user_id uuid, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_assigned_user_id uuid;
  v_step_status text;
  v_chain_status text;
  v_company_id uuid;
begin
  select acs.chain_id, acs.step_order, acs.assigned_user_id, acs.status
  into v_chain_id, v_step_order, v_assigned_user_id, v_step_status
  from public.internal_approval_chain_steps acs where acs.id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;
  select ac.status, r.company_id into v_chain_status, v_company_id
  from public.internal_approval_chains ac
  join public.internal_requests r on r.id = ac.internal_request_id
  where ac.id = v_chain_id;

  if v_chain_status <> 'pending' then
    raise exception 'سلسلة الاعتماد هذه غير نشطة حالياً';
  end if;
  if v_step_status <> 'pending' then
    raise exception 'هذه المرحلة ليست بانتظار إجراء';
  end if;
  if exists (
    select 1 from public.internal_approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> 'approved'
  ) then
    raise exception 'لم يصل الدور لهذه المرحلة بعد';
  end if;
  if (v_assigned_user_id is null or v_assigned_user_id <> auth.uid()) and not public.can_manage_org(v_company_id) then
    raise exception 'فقط الشخص المطلوب اعتماده بهذه المرحلة يقدر يضيف معتمداً إضافياً قبله';
  end if;
  if p_department_id is null and p_user_id is null then
    raise exception 'لازم تحديد قسم أو شخص للمعتمد الإضافي';
  end if;

  update public.internal_approval_chain_steps
  set step_order = step_order + 1
  where chain_id = v_chain_id and step_order >= v_step_order;

  insert into public.internal_approval_chain_steps (chain_id, step_order, department_id, assigned_user_id, inserted_by, note)
  values (v_chain_id, v_step_order, p_department_id, p_user_id, auth.uid(), p_note);
end;
$function$;

CREATE OR REPLACE FUNCTION public.is_company_owner(p_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.companies where id = p_company_id and created_by = auth.uid());
$function$;

CREATE OR REPLACE FUNCTION public.is_department_head(p_department_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    public.can_manage_org((select company_id from public.departments where id = p_department_id))
    or exists (
      select 1 from public.department_members dm
      where dm.department_id = p_department_id and dm.user_id = auth.uid() and dm.role = 'head'
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_department_head_of_type(p_project_id uuid, p_dept_type text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    public.can_manage_org((select company_id from public.projects where id = p_project_id))
    or exists (
      select 1
      from public.department_members dm
      join public.departments d on d.id = dm.department_id
      where dm.user_id = auth.uid()
        and dm.role = 'head'
        and d.type = p_dept_type
        and d.company_id = (select company_id from public.projects where id = p_project_id)
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_executive(p_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.department_members dm
    join public.departments d on d.id = dm.department_id
    where dm.user_id = auth.uid() and d.company_id = p_company_id and d.type = 'executive'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$function$;

CREATE OR REPLACE FUNCTION public.join_company_by_code(p_code text)
 RETURNS TABLE(result_company_id uuid, result_company_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company record;
  v_dept_id uuid;
begin
  select * into v_company from public.companies
  where company_code = upper(trim(p_code));

  if not found then
    raise exception 'رمز الشركة غير صحيح';
  end if;
  if v_company.company_code_expires_at is null or v_company.company_code_expires_at < now() then
    raise exception 'انتهت صلاحية رمز الانضمام، اطلب من إدارة الشركة رمزاً جديداً';
  end if;

  update public.profiles set company_id = v_company.id where id = auth.uid();

  select id into v_dept_id
  from public.departments
  where company_id = v_company.id and type = 'project_management'
  limit 1;

  if v_dept_id is not null then
    insert into public.department_members (department_id, user_id, role)
    values (v_dept_id, auth.uid(), 'member')
    on conflict (department_id, user_id) do nothing;
  end if;

  return query select v_company.id, v_company.name;
end;
$function$;

CREATE OR REPLACE FUNCTION public.list_all_companies_billing()
 RETURNS TABLE(id uuid, name text, subscription_status text, trial_ends_at timestamp with time zone, subscription_note text, subscription_updated_at timestamp with time zone, created_at timestamp with time zone, member_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select c.id, c.name, c.subscription_status, c.trial_ends_at, c.subscription_note,
         c.subscription_updated_at, c.created_at,
         (select count(*) from public.profiles p where p.company_id = c.id) as member_count
  from public.companies c
  where public.is_platform_admin()
  order by c.created_at desc;
$function$;

CREATE OR REPLACE FUNCTION public.notify_user(p_company_id uuid, p_user_id uuid, p_title text, p_body text, p_link text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id is null then
    return;
  end if;
  insert into public.notifications (company_id, user_id, title, body, link)
  values (p_company_id, p_user_id, p_title, p_body, p_link);
end;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_employee_manager_circular_chain()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_current uuid;
  v_hops int := 0;
begin
  if new.direct_manager_employee_id is null then
    return new;
  end if;

  if new.direct_manager_employee_id = new.id then
    raise exception 'لا يمكن أن يكون الموظف مديره المباشر بنفسه';
  end if;

  v_current := new.direct_manager_employee_id;
  while v_current is not null and v_hops < 1000 loop
    if v_current = new.id then
      raise exception 'لا يمكن تعيين هذا الشخص كمدير مباشر لأنه يُنشئ حلقة إدارية دائرية';
    end if;
    select direct_manager_employee_id into v_current from public.employees where id = v_current;
    v_hops := v_hops + 1;
  end loop;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.regenerate_company_code(p_company_id uuid)
 RETURNS TABLE(result_company_code text, result_expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_code text;
  v_expires timestamptz;
begin
  if not public.can_manage_org(p_company_id) then
    raise exception 'لا تملك صلاحية تجديد رمز الانضمام';
  end if;

  v_code := public.generate_company_code();
  v_expires := now() + interval '30 days';

  update public.companies
  set company_code = v_code, company_code_expires_at = v_expires
  where id = p_company_id;

  return query select v_code, v_expires;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reroute_approval_step(p_step_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_department_id uuid;
  v_step_status text;
  v_chain_status text;
begin
  select chain_id, step_order, department_id, status
  into v_chain_id, v_step_order, v_department_id, v_step_status
  from public.approval_chain_steps where id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;
  select status into v_chain_status from public.approval_chains where id = v_chain_id;
  if v_chain_status <> 'pending' then
    raise exception 'سلسلة الاعتماد هذه غير نشطة حالياً';
  end if;
  if v_step_status <> 'pending' then
    raise exception 'هذه المرحلة ليست بانتظار إجراء';
  end if;
  if v_department_id is null then
    raise exception 'هذه المرحلة موجّهة لشخص محدد عند إنشاء السلسلة، لا يمكن إعادة توجيهها';
  end if;
  if exists (
    select 1 from public.approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> 'approved'
  ) then
    raise exception 'لم يصل الدور لهذه المرحلة بعد';
  end if;
  if not public.is_department_head(v_department_id) then
    raise exception 'لا تملك صلاحية إعادة توجيه طلبات هذا القسم (رئيس القسم فقط)';
  end if;

  update public.approval_chain_steps
  set assigned_user_id = p_user_id, routed_by = auth.uid(), routed_at = now()
  where id = p_step_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reroute_internal_approval_step(p_step_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_department_id uuid;
  v_step_status text;
  v_chain_status text;
begin
  select chain_id, step_order, department_id, status
  into v_chain_id, v_step_order, v_department_id, v_step_status
  from public.internal_approval_chain_steps where id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;
  select status into v_chain_status from public.internal_approval_chains where id = v_chain_id;
  if v_chain_status <> 'pending' then
    raise exception 'سلسلة الاعتماد هذه غير نشطة حالياً';
  end if;
  if v_step_status <> 'pending' then
    raise exception 'هذه المرحلة ليست بانتظار إجراء';
  end if;
  if v_department_id is null then
    raise exception 'هذه المرحلة موجّهة لشخص محدد عند إنشاء السلسلة، لا يمكن إعادة توجيهها';
  end if;
  if exists (
    select 1 from public.internal_approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> 'approved'
  ) then
    raise exception 'لم يصل الدور لهذه المرحلة بعد';
  end if;
  if not public.is_department_head(v_department_id) then
    raise exception 'لا تملك صلاحية إعادة توجيه طلبات هذا القسم (رئيس القسم فقط)';
  end if;

  update public.internal_approval_chain_steps
  set assigned_user_id = p_user_id, routed_by = auth.uid(), routed_at = now()
  where id = p_step_id;
end;
$function$;

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
  select a.project_id, e.status into v_project_id, v_status
  from public.budget_actual_entries e
  join public.activities a on a.id = e.activity_id
  where e.id = p_entry_id;

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
  select project_id, status into v_project_id, v_status from public.contracts where id = p_contract_id;
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

CREATE OR REPLACE FUNCTION public.review_approval_step(p_step_id uuid, p_approve boolean, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

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
  select a.project_id, e.status into v_project_id, v_status
  from public.budget_actual_entries e
  join public.activities a on a.id = e.activity_id
  where e.id = p_entry_id;

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
  select project_id, status into v_project_id, v_status from public.contracts where id = p_contract_id;
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
  select p.id, ew.status into v_project_id, v_status
  from public.contract_extra_works ew
  join public.contracts c on c.id = ew.contract_id
  join public.projects p on p.id = c.project_id
  where ew.id = p_extra_work_id;

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
  select p.project_id, cp.status into v_project_id, v_status
  from public.contract_payments cp
  join public.contracts c on c.id = cp.contract_id
  join public.projects p on p.id = c.project_id
  where cp.id = p_payment_id;

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
  select project_id, settlement_status into v_project_id, v_settlement_status
  from public.contracts where id = p_contract_id;

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

CREATE OR REPLACE FUNCTION public.review_internal_approval_step(p_step_id uuid, p_approve boolean, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_assigned_user_id uuid;
  v_step_status text;
  v_chain_status text;
  v_request_id uuid;
  v_company_id uuid;
  v_title text;
  v_owner_id uuid;
  v_max_order integer;
  v_next_step_id uuid;
  v_next_assigned uuid;
begin
  select acs.chain_id, acs.step_order, acs.assigned_user_id, acs.status
  into v_chain_id, v_step_order, v_assigned_user_id, v_step_status
  from public.internal_approval_chain_steps acs where acs.id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;

  select ac.status, ac.internal_request_id, r.company_id, r.title, r.user_id
  into v_chain_status, v_request_id, v_company_id, v_title, v_owner_id
  from public.internal_approval_chains ac
  join public.internal_requests r on r.id = ac.internal_request_id
  where ac.id = v_chain_id;

  if v_chain_status <> 'pending' then
    raise exception 'سلسلة الاعتماد هذه غير نشطة حالياً';
  end if;
  if v_step_status <> 'pending' then
    raise exception 'هذه المرحلة ليست بانتظار إجراء';
  end if;
  if exists (
    select 1 from public.internal_approval_chain_steps
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

  update public.internal_approval_chain_steps
  set status = case when p_approve then 'approved' else 'rejected' end,
      acted_by = auth.uid(), acted_at = now(), note = p_note
  where id = p_step_id;

  if not p_approve then
    update public.internal_approval_chain_steps set status = 'skipped' where chain_id = v_chain_id and status = 'pending';
    update public.internal_approval_chains set status = 'rejected', decided_at = now() where id = v_chain_id;
    update public.internal_requests set status = 'rejected' where id = v_request_id;
    perform public.notify_user(v_company_id, v_owner_id, 'رُفض طلبك', v_title, '/my-requests');
  else
    select max(step_order) into v_max_order from public.internal_approval_chain_steps where chain_id = v_chain_id;
    if v_step_order = v_max_order then
      update public.internal_approval_chains set status = 'approved', decided_at = now() where id = v_chain_id;
      update public.internal_requests set status = 'approved' where id = v_request_id;
      perform public.notify_user(v_company_id, v_owner_id, 'تم اعتماد طلبك', v_title, '/my-requests');
    else
      select id, assigned_user_id into v_next_step_id, v_next_assigned
      from public.internal_approval_chain_steps
      where chain_id = v_chain_id and step_order > v_step_order
      order by step_order limit 1;
      if v_next_assigned is not null then
        perform public.notify_user(v_company_id, v_next_assigned, 'طلب بانتظار اعتمادك', v_title, '/my-requests');
      end if;
    end if;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.route_approval_step(p_step_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_department_id uuid;
  v_assigned_user_id uuid;
  v_step_status text;
  v_chain_status text;
begin
  select chain_id, step_order, department_id, assigned_user_id, status
  into v_chain_id, v_step_order, v_department_id, v_assigned_user_id, v_step_status
  from public.approval_chain_steps where id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;
  select status into v_chain_status from public.approval_chains where id = v_chain_id;
  if v_chain_status <> 'pending' then
    raise exception 'سلسلة الاعتماد هذه غير نشطة حالياً';
  end if;
  if v_step_status <> 'pending' then
    raise exception 'هذه المرحلة ليست بانتظار إجراء';
  end if;
  if v_department_id is null then
    raise exception 'هذه المرحلة موجّهة لشخص محدد مسبقاً، لا تحتاج تحويل';
  end if;
  if v_assigned_user_id is not null then
    raise exception 'هذه المرحلة محوّلة مسبقاً';
  end if;
  if exists (
    select 1 from public.approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> 'approved'
  ) then
    raise exception 'لم يصل الدور لهذه المرحلة بعد';
  end if;
  if not public.is_department_head(v_department_id) then
    raise exception 'لا تملك صلاحية توجيه طلبات هذا القسم (رئيس القسم فقط)';
  end if;

  update public.approval_chain_steps
  set assigned_user_id = p_user_id, routed_by = auth.uid(), routed_at = now()
  where id = p_step_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.route_internal_approval_step(p_step_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_department_id uuid;
  v_assigned_user_id uuid;
  v_step_status text;
  v_chain_status text;
  v_company_id uuid;
  v_title text;
begin
  select chain_id, step_order, department_id, assigned_user_id, status
  into v_chain_id, v_step_order, v_department_id, v_assigned_user_id, v_step_status
  from public.internal_approval_chain_steps where id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;
  select ac.status, r.company_id, r.title into v_chain_status, v_company_id, v_title
  from public.internal_approval_chains ac
  join public.internal_requests r on r.id = ac.internal_request_id
  where ac.id = v_chain_id;

  if v_chain_status <> 'pending' then
    raise exception 'سلسلة الاعتماد هذه غير نشطة حالياً';
  end if;
  if v_step_status <> 'pending' then
    raise exception 'هذه المرحلة ليست بانتظار إجراء';
  end if;
  if v_department_id is null then
    raise exception 'هذه المرحلة موجّهة لشخص محدد مسبقاً، لا تحتاج تحويل';
  end if;
  if v_assigned_user_id is not null then
    raise exception 'هذه المرحلة محوّلة مسبقاً';
  end if;
  if exists (
    select 1 from public.internal_approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> 'approved'
  ) then
    raise exception 'لم يصل الدور لهذه المرحلة بعد';
  end if;
  if not public.is_department_head(v_department_id) then
    raise exception 'لا تملك صلاحية توجيه طلبات هذا القسم (رئيس القسم فقط)';
  end if;

  update public.internal_approval_chain_steps
  set assigned_user_id = p_user_id, routed_by = auth.uid(), routed_at = now()
  where id = p_step_id;

  perform public.notify_user(v_company_id, p_user_id, 'طلب موجَّه إليك للاعتماد', v_title, '/my-requests');
end;
$function$;

CREATE OR REPLACE FUNCTION public.send_back_approval_step(p_step_id uuid, p_target_step_id uuid, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.send_back_internal_approval_step(p_step_id uuid, p_target_step_id uuid, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_assigned_user_id uuid;
  v_step_status text;
  v_chain_status text;
  v_chain_type text;
  v_company_id uuid;
  v_title text;
  v_target_chain_id uuid;
  v_target_order integer;
  v_target_assigned uuid;
begin
  select acs.chain_id, acs.step_order, acs.assigned_user_id, acs.status
  into v_chain_id, v_step_order, v_assigned_user_id, v_step_status
  from public.internal_approval_chain_steps acs where acs.id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;

  select ac.status, ac.chain_type, r.company_id, r.title
  into v_chain_status, v_chain_type, v_company_id, v_title
  from public.internal_approval_chains ac
  join public.internal_requests r on r.id = ac.internal_request_id
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
    select 1 from public.internal_approval_chain_steps
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

  select chain_id, step_order, assigned_user_id into v_target_chain_id, v_target_order, v_target_assigned
  from public.internal_approval_chain_steps where id = p_target_step_id;

  if v_target_chain_id is distinct from v_chain_id then
    raise exception 'المرحلة المستهدفة ليست ضمن نفس السلسلة';
  end if;
  if v_target_order >= v_step_order then
    raise exception 'الإرجاع يكون فقط لمرحلة سابقة';
  end if;

  update public.internal_approval_chain_steps
  set status = 'pending', acted_by = null, acted_at = null,
      note = case when id = p_target_step_id then p_note else null end
  where chain_id = v_chain_id and step_order between v_target_order and v_step_order;

  if v_target_assigned is not null then
    perform public.notify_user(v_company_id, v_target_assigned, 'أُعيد إليك طلب لاستكمال/توضيح', v_title, '/my-requests');
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_company_subscription(p_company_id uuid, p_status text, p_trial_ends_at timestamp with time zone, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_platform_admin() then
    raise exception 'هذا الإجراء محصور بإدارة المنصة';
  end if;
  if p_status not in ('trial', 'active', 'expired', 'canceled') then
    raise exception 'حالة اشتراك غير صحيحة';
  end if;

  update public.companies
  set subscription_status = p_status,
      trial_ends_at = coalesce(p_trial_ends_at, trial_ends_at),
      subscription_note = p_note,
      subscription_updated_by = auth.uid(),
      subscription_updated_at = now()
  where id = p_company_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_project_departments(p_project_id uuid, p_department_id uuid, p_procurement_department_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

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
  select a.project_id, e.status, e.amount into v_project_id, v_status, v_amount
  from public.budget_actual_entries e
  join public.activities a on a.id = e.activity_id
  where e.id = p_entry_id;

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
  select project_id, status, total_value into v_project_id, v_status, v_total_value
  from public.contracts where id = p_contract_id;

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
  select p.id, ew.status, ew.amount into v_project_id, v_status, v_amount
  from public.contract_extra_works ew
  join public.contracts c on c.id = ew.contract_id
  join public.projects p on p.id = c.project_id
  where ew.id = p_extra_work_id;

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
  select p.project_id, cp.status into v_project_id, v_status
  from public.contract_payments cp
  join public.contracts c on c.id = cp.contract_id
  join public.projects p on p.id = c.project_id
  where cp.id = p_payment_id;

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
  select project_id, status, settlement_status into v_project_id, v_status, v_settlement_status
  from public.contracts where id = p_contract_id;

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

CREATE OR REPLACE FUNCTION public.submit_material_purchase_chain(p_request_id uuid, p_steps jsonb, p_note text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.submit_material_sourcing(p_request_id uuid, p_note text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sync_employee_from_department_member()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
  v_employee_id uuid;
  v_full_name text;
  v_email text;
begin
  select company_id into v_company_id from public.departments where id = new.department_id;
  select full_name into v_full_name from public.profiles where id = new.user_id;
  select email into v_email from auth.users where id = new.user_id;

  select id into v_employee_id from public.employees where user_id = new.user_id and company_id = v_company_id;

  if v_employee_id is null and v_email is not null then
    select id into v_employee_id from public.employees
    where company_id = v_company_id and user_id is null and lower(email) = lower(v_email)
    limit 1;
    if v_employee_id is not null then
      update public.employees set user_id = new.user_id, status = 'active' where id = v_employee_id;
    end if;
  end if;

  if v_employee_id is null then
    insert into public.employees (company_id, department_id, full_name, email, user_id, status)
    values (v_company_id, new.department_id, coalesce(v_full_name, 'بدون اسم'), v_email, new.user_id, 'active')
    returning id into v_employee_id;
  end if;

  new.employee_id := v_employee_id;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.touch_employee_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.validate_activity_contract_link()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.linked_contract_id is not null then
    if not exists (
      select 1 from public.contracts c
      where c.id = new.linked_contract_id and c.project_id = new.project_id
    ) then
      raise exception 'linked_contract_id must belong to the same project';
    end if;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.validate_department_member_taxonomy()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid;
begin
  select company_id into v_company_id from public.departments where id = new.department_id;

  if new.organizational_level_id is not null and not exists (
    select 1 from public.organizational_levels where id = new.organizational_level_id and company_id = v_company_id
  ) then
    raise exception 'المستوى الإداري المختار لا يتبع لنفس الشركة';
  end if;

  if new.organizational_classification_id is not null and not exists (
    select 1 from public.organizational_classifications where id = new.organizational_classification_id and company_id = v_company_id
  ) then
    raise exception 'التصنيف المختار لا يتبع لنفس الشركة';
  end if;

  if new.job_title_id is not null and not exists (
    select 1 from public.job_titles where id = new.job_title_id and company_id = v_company_id
  ) then
    raise exception 'المسمّى الوظيفي المختار لا يتبع لنفس الشركة';
  end if;

  if new.employee_id is not null and not exists (
    select 1 from public.employees where id = new.employee_id and company_id = v_company_id
  ) then
    raise exception 'سجل الموظف المرتبط لا يتبع لنفس الشركة';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.validate_employee_references()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.department_id is not null and not exists (
    select 1 from public.departments where id = new.department_id and company_id = new.company_id
  ) then
    raise exception 'القسم المختار لا يتبع لنفس شركة الموظف';
  end if;

  if new.organizational_level_id is not null and not exists (
    select 1 from public.organizational_levels where id = new.organizational_level_id and company_id = new.company_id
  ) then
    raise exception 'المستوى الإداري المختار لا يتبع لنفس شركة الموظف';
  end if;

  if new.organizational_classification_id is not null and not exists (
    select 1 from public.organizational_classifications where id = new.organizational_classification_id and company_id = new.company_id
  ) then
    raise exception 'التصنيف المختار لا يتبع لنفس شركة الموظف';
  end if;

  if new.job_title_id is not null and not exists (
    select 1 from public.job_titles where id = new.job_title_id and company_id = new.company_id
  ) then
    raise exception 'المسمّى الوظيفي المختار لا يتبع لنفس شركة الموظف';
  end if;

  if new.direct_manager_employee_id is not null and not exists (
    select 1 from public.employees where id = new.direct_manager_employee_id and company_id = new.company_id
  ) then
    raise exception 'المدير المباشر المختار لا يتبع لنفس شركة الموظف';
  end if;

  return new;
end;
$function$;

ALTER TABLE public."activities" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."activities" ALTER COLUMN "order" SET DEFAULT 1;

ALTER TABLE public."activities" ALTER COLUMN "duration_days" SET DEFAULT 1;

ALTER TABLE public."activities" ALTER COLUMN "done" SET DEFAULT false;

ALTER TABLE public."activities" ALTER COLUMN "calendar_type" SET DEFAULT 'workdays'::text;

ALTER TABLE public."activities" ALTER COLUMN "lag_days" SET DEFAULT 0;

ALTER TABLE public."activities" ALTER COLUMN "lag_unit" SET DEFAULT 'day'::text;

ALTER TABLE public."activities" ALTER COLUMN "critical" SET DEFAULT false;

ALTER TABLE public."activities" ALTER COLUMN "alert_lead_days" SET DEFAULT 7;

ALTER TABLE public."activities" ALTER COLUMN "requires_receiving" SET DEFAULT false;

ALTER TABLE public."activities" ALTER COLUMN "scope_type" SET DEFAULT 'project'::text;

ALTER TABLE public."activities" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."approval_chain_steps" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."approval_chain_steps" ALTER COLUMN "status" SET DEFAULT 'pending'::text;

ALTER TABLE public."approval_chain_steps" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."approval_chain_template_steps" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."approval_chain_templates" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."approval_chain_templates" ALTER COLUMN "chain_type" SET DEFAULT 'linear'::text;

ALTER TABLE public."approval_chain_templates" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."approval_chains" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."approval_chains" ALTER COLUMN "status" SET DEFAULT 'pending'::text;

ALTER TABLE public."approval_chains" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."approval_chains" ALTER COLUMN "chain_type" SET DEFAULT 'linear'::text;

ALTER TABLE public."audit_log" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."audit_log" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."budget_actual_entries" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."budget_actual_entries" ALTER COLUMN "amount" SET DEFAULT 0;

ALTER TABLE public."budget_actual_entries" ALTER COLUMN "source" SET DEFAULT 'contract'::text;

ALTER TABLE public."budget_actual_entries" ALTER COLUMN "status" SET DEFAULT 'draft'::text;

ALTER TABLE public."budget_reconciliation_notes" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."budget_reconciliation_notes" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."budget_reconciliation_notes" ALTER COLUMN "status" SET DEFAULT 'pending'::text;

ALTER TABLE public."budget_reconciliation_notes" ALTER COLUMN "kind" SET DEFAULT 'value_vs_planned'::text;

ALTER TABLE public."checklist_items" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."checklist_items" ALTER COLUMN "photo_required" SET DEFAULT false;

ALTER TABLE public."checklist_items" ALTER COLUMN "order" SET DEFAULT 1;

ALTER TABLE public."checklist_results" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."checklist_results" ALTER COLUMN "checked" SET DEFAULT false;

ALTER TABLE public."companies" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."companies" ALTER COLUMN "archive_folder_name" SET DEFAULT 'أرشيف المشاريع'::text;

ALTER TABLE public."companies" ALTER COLUMN "archive_storage_type" SET DEFAULT 'cloud'::text;

ALTER TABLE public."companies" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."companies" ALTER COLUMN "created_by" SET DEFAULT auth.uid();

ALTER TABLE public."companies" ALTER COLUMN "print_mode" SET DEFAULT 'none'::text;

ALTER TABLE public."companies" ALTER COLUMN "print_margin_top" SET DEFAULT 20;

ALTER TABLE public."companies" ALTER COLUMN "print_margin_bottom" SET DEFAULT 20;

ALTER TABLE public."companies" ALTER COLUMN "print_margin_left" SET DEFAULT 15;

ALTER TABLE public."companies" ALTER COLUMN "print_margin_right" SET DEFAULT 15;

ALTER TABLE public."companies" ALTER COLUMN "header_color" SET DEFAULT '#171B26'::text;

ALTER TABLE public."companies" ALTER COLUMN "company_code" SET DEFAULT generate_company_code();

ALTER TABLE public."companies" ALTER COLUMN "country_code" SET DEFAULT 'SA'::text;

ALTER TABLE public."companies" ALTER COLUMN "subscription_status" SET DEFAULT 'trial'::text;

ALTER TABLE public."companies" ALTER COLUMN "trial_ends_at" SET DEFAULT (now() + '30 days'::interval);

ALTER TABLE public."companies" ALTER COLUMN "vat_rate" SET DEFAULT 15;

ALTER TABLE public."companies" ALTER COLUMN "is_individual" SET DEFAULT false;

ALTER TABLE public."company_holidays" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."company_holidays" ALTER COLUMN "recurring_yearly" SET DEFAULT true;

ALTER TABLE public."company_holidays" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."contract_deductions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."contract_deductions" ALTER COLUMN "deducted_at" SET DEFAULT CURRENT_DATE;

ALTER TABLE public."contract_deductions" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."contract_extra_works" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."contract_extra_works" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."contract_extra_works" ALTER COLUMN "status" SET DEFAULT 'draft'::text;

ALTER TABLE public."contract_line_items" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."contract_line_items" ALTER COLUMN "order" SET DEFAULT 0;

ALTER TABLE public."contract_payments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."contract_payments" ALTER COLUMN "paid" SET DEFAULT false;

ALTER TABLE public."contract_payments" ALTER COLUMN "order" SET DEFAULT 0;

ALTER TABLE public."contract_payments" ALTER COLUMN "is_advance_payment" SET DEFAULT false;

ALTER TABLE public."contract_payments" ALTER COLUMN "status" SET DEFAULT 'pending'::text;

ALTER TABLE public."contracts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."contracts" ALTER COLUMN "has_advance_payment" SET DEFAULT false;

ALTER TABLE public."contracts" ALTER COLUMN "advance_deduction_percentage" SET DEFAULT 10;

ALTER TABLE public."contracts" ALTER COLUMN "retention_released" SET DEFAULT false;

ALTER TABLE public."contracts" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."contracts" ALTER COLUMN "contract_name" SET DEFAULT 'العقد الرئيسي'::text;

ALTER TABLE public."contracts" ALTER COLUMN "status" SET DEFAULT 'draft'::text;

ALTER TABLE public."contracts" ALTER COLUMN "settlement_status" SET DEFAULT 'open'::text;

ALTER TABLE public."contracts" ALTER COLUMN "vat_inclusive" SET DEFAULT false;

ALTER TABLE public."custom_calendars" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."custom_calendars" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."department_members" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."department_members" ALTER COLUMN "role" SET DEFAULT 'member'::text;

ALTER TABLE public."department_members" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."departments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."departments" ALTER COLUMN "type" SET DEFAULT 'custom'::text;

ALTER TABLE public."departments" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."document_folders" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."document_folders" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."documents" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."documents" ALTER COLUMN "uploaded_at" SET DEFAULT now();

ALTER TABLE public."employees" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."employees" ALTER COLUMN "status" SET DEFAULT 'active'::text;

ALTER TABLE public."employees" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."employees" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE public."internal_approval_chain_steps" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."internal_approval_chain_steps" ALTER COLUMN "status" SET DEFAULT 'pending'::text;

ALTER TABLE public."internal_approval_chain_steps" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."internal_approval_chains" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."internal_approval_chains" ALTER COLUMN "chain_type" SET DEFAULT 'linear'::text;

ALTER TABLE public."internal_approval_chains" ALTER COLUMN "status" SET DEFAULT 'pending'::text;

ALTER TABLE public."internal_approval_chains" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."internal_request_attachment_revisions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."internal_request_attachment_revisions" ALTER COLUMN "uploaded_at" SET DEFAULT now();

ALTER TABLE public."internal_request_attachments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."internal_request_attachments" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."internal_requests" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."internal_requests" ALTER COLUMN "status" SET DEFAULT 'pending'::text;

ALTER TABLE public."internal_requests" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."invites" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."invites" ALTER COLUMN "role" SET DEFAULT 'member'::text;

ALTER TABLE public."invites" ALTER COLUMN "token" SET DEFAULT encode(gen_random_bytes(16), 'hex'::text);

ALTER TABLE public."invites" ALTER COLUMN "status" SET DEFAULT 'pending'::text;

ALTER TABLE public."invites" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."invites" ALTER COLUMN "expires_at" SET DEFAULT (now() + '14 days'::interval);

ALTER TABLE public."job_titles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."job_titles" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."material_request_attachments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."material_request_attachments" ALTER COLUMN "uploaded_at" SET DEFAULT now();

ALTER TABLE public."material_request_options" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."material_request_options" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."material_requests" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."material_requests" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."material_requests" ALTER COLUMN "status" SET DEFAULT 'draft'::text;

ALTER TABLE public."notifications" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."notifications" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."organizational_classifications" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."organizational_classifications" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."organizational_levels" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."organizational_levels" ALTER COLUMN "order_index" SET DEFAULT 0;

ALTER TABLE public."organizational_levels" ALTER COLUMN "is_management_level" SET DEFAULT false;

ALTER TABLE public."organizational_levels" ALTER COLUMN "is_employee_level" SET DEFAULT false;

ALTER TABLE public."organizational_levels" ALTER COLUMN "is_worker_level" SET DEFAULT false;

ALTER TABLE public."organizational_levels" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."platform_admins" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."profiles" ALTER COLUMN "full_name" SET DEFAULT ''::text;

ALTER TABLE public."profiles" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."project_members" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."project_members" ALTER COLUMN "role" SET DEFAULT 'member'::text;

ALTER TABLE public."project_members" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."projects" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."projects" ALTER COLUMN "manager_name" SET DEFAULT ''::text;

ALTER TABLE public."projects" ALTER COLUMN "location" SET DEFAULT ''::text;

ALTER TABLE public."projects" ALTER COLUMN "map_link" SET DEFAULT ''::text;

ALTER TABLE public."projects" ALTER COLUMN "area" SET DEFAULT ''::text;

ALTER TABLE public."projects" ALTER COLUMN "units_count" SET DEFAULT ''::text;

ALTER TABLE public."projects" ALTER COLUMN "project_type" SET DEFAULT 'سكني'::text;

ALTER TABLE public."projects" ALTER COLUMN "theme_color" SET DEFAULT '#E86B2C'::text;

ALTER TABLE public."projects" ALTER COLUMN "theme_icon" SET DEFAULT '🏗️'::text;

ALTER TABLE public."projects" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."projects" ALTER COLUMN "status" SET DEFAULT 'preparing'::text;

ALTER TABLE public."submission_images" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."submissions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."submissions" ALTER COLUMN "manager_name" SET DEFAULT ''::text;

ALTER TABLE public."submissions" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."tasks" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE public."tasks" ALTER COLUMN "status" SET DEFAULT 'todo'::text;

ALTER TABLE public."tasks" ALTER COLUMN "priority" SET DEFAULT 'medium'::text;

ALTER TABLE public."tasks" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE public."activities" ADD CONSTRAINT "activities_budget_type_check" CHECK (((budget_type IS NULL) OR (budget_type = ANY (ARRAY['lumpsum'::text, 'boq'::text, 'estimated'::text]))));

ALTER TABLE public."activities" ADD CONSTRAINT "activities_calendar_type_check" CHECK ((calendar_type = ANY (ARRAY['calendar'::text, 'workdays'::text])));

ALTER TABLE public."activities" ADD CONSTRAINT "activities_dep_type_check" CHECK ((dep_type = ANY (ARRAY['SS'::text, 'FS'::text])));

ALTER TABLE public."activities" ADD CONSTRAINT "activities_lag_unit_check" CHECK ((lag_unit = ANY (ARRAY['day'::text, 'month'::text])));

ALTER TABLE public."activities" ADD CONSTRAINT "activities_pkey" PRIMARY KEY (id);

ALTER TABLE public."activities" ADD CONSTRAINT "activities_scope_type_check" CHECK ((scope_type = ANY (ARRAY['project'::text, 'zone'::text, 'unit'::text, 'facility'::text])));

ALTER TABLE public."approval_chain_steps" ADD CONSTRAINT "approval_chain_steps_chain_id_step_order_key" UNIQUE (chain_id, step_order);

ALTER TABLE public."approval_chain_steps" ADD CONSTRAINT "approval_chain_steps_check" CHECK (((department_id IS NOT NULL) OR (assigned_user_id IS NOT NULL)));

ALTER TABLE public."approval_chain_steps" ADD CONSTRAINT "approval_chain_steps_pkey" PRIMARY KEY (id);

ALTER TABLE public."approval_chain_steps" ADD CONSTRAINT "approval_chain_steps_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'skipped'::text])));

ALTER TABLE public."approval_chain_template_steps" ADD CONSTRAINT "approval_chain_template_steps_check" CHECK (((department_id IS NOT NULL) OR (assigned_user_id IS NOT NULL)));

ALTER TABLE public."approval_chain_template_steps" ADD CONSTRAINT "approval_chain_template_steps_pkey" PRIMARY KEY (id);

ALTER TABLE public."approval_chain_template_steps" ADD CONSTRAINT "approval_chain_template_steps_template_id_step_order_key" UNIQUE (template_id, step_order);

ALTER TABLE public."approval_chain_templates" ADD CONSTRAINT "approval_chain_templates_chain_type_check" CHECK ((chain_type = ANY (ARRAY['linear'::text, 'network'::text])));

ALTER TABLE public."approval_chain_templates" ADD CONSTRAINT "approval_chain_templates_pkey" PRIMARY KEY (id);

ALTER TABLE public."approval_chains" ADD CONSTRAINT "approval_chains_chain_type_check" CHECK ((chain_type = ANY (ARRAY['linear'::text, 'network'::text])));

ALTER TABLE public."approval_chains" ADD CONSTRAINT "approval_chains_phase_check" CHECK ((phase = ANY (ARRAY['sample'::text, 'purchase'::text])));

ALTER TABLE public."approval_chains" ADD CONSTRAINT "approval_chains_pkey" PRIMARY KEY (id);

ALTER TABLE public."approval_chains" ADD CONSTRAINT "approval_chains_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE public."audit_log" ADD CONSTRAINT "audit_log_action_check" CHECK ((action = ANY (ARRAY['insert'::text, 'update'::text, 'delete'::text])));

ALTER TABLE public."audit_log" ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY (id);

ALTER TABLE public."budget_actual_entries" ADD CONSTRAINT "budget_actual_entries_pkey" PRIMARY KEY (id);

ALTER TABLE public."budget_actual_entries" ADD CONSTRAINT "budget_actual_entries_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'pending_pm_approval'::text, 'pending_finance_approval'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE public."budget_reconciliation_notes" ADD CONSTRAINT "budget_reconciliation_notes_kind_check" CHECK ((kind = ANY (ARRAY['value_vs_planned'::text, 'paid_vs_actual'::text])));

ALTER TABLE public."budget_reconciliation_notes" ADD CONSTRAINT "budget_reconciliation_notes_pkey" PRIMARY KEY (id);

ALTER TABLE public."budget_reconciliation_notes" ADD CONSTRAINT "budget_reconciliation_notes_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE public."checklist_items" ADD CONSTRAINT "checklist_items_pkey" PRIMARY KEY (id);

ALTER TABLE public."checklist_results" ADD CONSTRAINT "checklist_results_pkey" PRIMARY KEY (id);

ALTER TABLE public."companies" ADD CONSTRAINT "companies_archive_storage_type_check" CHECK ((archive_storage_type = ANY (ARRAY['cloud'::text, 'local'::text, 'drive'::text])));

ALTER TABLE public."companies" ADD CONSTRAINT "companies_company_code_key" UNIQUE (company_code);

ALTER TABLE public."companies" ADD CONSTRAINT "companies_pkey" PRIMARY KEY (id);

ALTER TABLE public."companies" ADD CONSTRAINT "companies_print_mode_check" CHECK ((print_mode = ANY (ARRAY['none'::text, 'header_footer'::text, 'full_page'::text])));

ALTER TABLE public."companies" ADD CONSTRAINT "companies_subscription_status_check" CHECK ((subscription_status = ANY (ARRAY['trial'::text, 'active'::text, 'expired'::text, 'canceled'::text])));

ALTER TABLE public."company_holidays" ADD CONSTRAINT "company_holidays_pkey" PRIMARY KEY (id);

ALTER TABLE public."contract_deductions" ADD CONSTRAINT "contract_deductions_pkey" PRIMARY KEY (id);

ALTER TABLE public."contract_extra_works" ADD CONSTRAINT "contract_extra_works_pkey" PRIMARY KEY (id);

ALTER TABLE public."contract_extra_works" ADD CONSTRAINT "contract_extra_works_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'pending_pm_approval'::text, 'pending_finance_approval'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE public."contract_line_items" ADD CONSTRAINT "contract_line_items_pkey" PRIMARY KEY (id);

ALTER TABLE public."contract_payments" ADD CONSTRAINT "contract_payments_pkey" PRIMARY KEY (id);

ALTER TABLE public."contract_payments" ADD CONSTRAINT "contract_payments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'pending_pm_approval'::text, 'pending_finance_approval'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE public."contracts" ADD CONSTRAINT "contracts_pkey" PRIMARY KEY (id);

ALTER TABLE public."contracts" ADD CONSTRAINT "contracts_settlement_status_check" CHECK ((settlement_status = ANY (ARRAY['open'::text, 'pending_pm_approval'::text, 'pending_finance_approval'::text, 'settled'::text, 'rejected'::text])));

ALTER TABLE public."contracts" ADD CONSTRAINT "contracts_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'pending_pm_approval'::text, 'pending_finance_approval'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE public."custom_calendars" ADD CONSTRAINT "custom_calendars_pkey" PRIMARY KEY (id);

ALTER TABLE public."department_members" ADD CONSTRAINT "department_members_department_id_user_id_key" UNIQUE (department_id, user_id);

ALTER TABLE public."department_members" ADD CONSTRAINT "department_members_pkey" PRIMARY KEY (id);

ALTER TABLE public."department_members" ADD CONSTRAINT "department_members_role_check" CHECK ((role = ANY (ARRAY['member'::text, 'head'::text])));

ALTER TABLE public."departments" ADD CONSTRAINT "departments_id_company_uk" UNIQUE (id, company_id);

ALTER TABLE public."departments" ADD CONSTRAINT "departments_pkey" PRIMARY KEY (id);

ALTER TABLE public."departments" ADD CONSTRAINT "departments_type_check" CHECK ((type = ANY (ARRAY['project_management'::text, 'finance'::text, 'hr'::text, 'executive'::text, 'procurement'::text, 'custom'::text])));

ALTER TABLE public."document_folders" ADD CONSTRAINT "document_folders_pkey" PRIMARY KEY (id);

ALTER TABLE public."documents" ADD CONSTRAINT "documents_pkey" PRIMARY KEY (id);

ALTER TABLE public."employees" ADD CONSTRAINT "employees_pkey" PRIMARY KEY (id);

ALTER TABLE public."employees" ADD CONSTRAINT "employees_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'invited'::text, 'pending'::text, 'inactive'::text])));

ALTER TABLE public."internal_approval_chain_steps" ADD CONSTRAINT "internal_approval_chain_steps_chain_id_step_order_key" UNIQUE (chain_id, step_order);

ALTER TABLE public."internal_approval_chain_steps" ADD CONSTRAINT "internal_approval_chain_steps_check" CHECK (((department_id IS NOT NULL) OR (assigned_user_id IS NOT NULL)));

ALTER TABLE public."internal_approval_chain_steps" ADD CONSTRAINT "internal_approval_chain_steps_pkey" PRIMARY KEY (id);

ALTER TABLE public."internal_approval_chain_steps" ADD CONSTRAINT "internal_approval_chain_steps_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'skipped'::text])));

ALTER TABLE public."internal_approval_chains" ADD CONSTRAINT "internal_approval_chains_chain_type_check" CHECK ((chain_type = ANY (ARRAY['linear'::text, 'network'::text])));

ALTER TABLE public."internal_approval_chains" ADD CONSTRAINT "internal_approval_chains_pkey" PRIMARY KEY (id);

ALTER TABLE public."internal_approval_chains" ADD CONSTRAINT "internal_approval_chains_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE public."internal_request_attachment_revisions" ADD CONSTRAINT "internal_request_attachment_r_attachment_id_revision_number_key" UNIQUE (attachment_id, revision_number);

ALTER TABLE public."internal_request_attachment_revisions" ADD CONSTRAINT "internal_request_attachment_revisions_pkey" PRIMARY KEY (id);

ALTER TABLE public."internal_request_attachments" ADD CONSTRAINT "internal_request_attachments_pkey" PRIMARY KEY (id);

ALTER TABLE public."internal_requests" ADD CONSTRAINT "internal_requests_pkey" PRIMARY KEY (id);

ALTER TABLE public."internal_requests" ADD CONSTRAINT "internal_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE public."internal_requests" ADD CONSTRAINT "internal_requests_type_check" CHECK ((type = ANY (ARRAY['leave'::text, 'contract_renewal'::text, 'other'::text, 'inquiry'::text, 'objection'::text, 'complaint'::text, 'approval'::text])));

ALTER TABLE public."invites" ADD CONSTRAINT "invites_pkey" PRIMARY KEY (id);

ALTER TABLE public."invites" ADD CONSTRAINT "invites_role_check" CHECK ((role = ANY (ARRAY['member'::text, 'head'::text])));

ALTER TABLE public."invites" ADD CONSTRAINT "invites_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text])));

ALTER TABLE public."invites" ADD CONSTRAINT "invites_token_key" UNIQUE (token);

ALTER TABLE public."job_titles" ADD CONSTRAINT "job_titles_pkey" PRIMARY KEY (id);

ALTER TABLE public."material_request_attachments" ADD CONSTRAINT "material_request_attachments_pkey" PRIMARY KEY (id);

ALTER TABLE public."material_request_options" ADD CONSTRAINT "material_request_options_pkey" PRIMARY KEY (id);

ALTER TABLE public."material_requests" ADD CONSTRAINT "material_requests_pkey" PRIMARY KEY (id);

ALTER TABLE public."material_requests" ADD CONSTRAINT "material_requests_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'sample_pending'::text, 'sample_approved'::text, 'sample_rejected'::text, 'purchase_pending'::text, 'purchase_approved'::text, 'purchase_rejected'::text])));

ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY (id);

ALTER TABLE public."organizational_classifications" ADD CONSTRAINT "organizational_classifications_pkey" PRIMARY KEY (id);

ALTER TABLE public."organizational_levels" ADD CONSTRAINT "organizational_levels_pkey" PRIMARY KEY (id);

ALTER TABLE public."platform_admins" ADD CONSTRAINT "platform_admins_pkey" PRIMARY KEY (user_id);

ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);

ALTER TABLE public."project_members" ADD CONSTRAINT "project_members_pkey" PRIMARY KEY (id);

ALTER TABLE public."project_members" ADD CONSTRAINT "project_members_project_id_user_id_key" UNIQUE (project_id, user_id);

ALTER TABLE public."project_members" ADD CONSTRAINT "project_members_role_check" CHECK ((role = ANY (ARRAY['manager'::text, 'member'::text])));

ALTER TABLE public."projects" ADD CONSTRAINT "projects_pkey" PRIMARY KEY (id);

ALTER TABLE public."projects" ADD CONSTRAINT "projects_status_check" CHECK ((status = ANY (ARRAY['preparing'::text, 'active'::text, 'completed'::text])));

ALTER TABLE public."submission_images" ADD CONSTRAINT "submission_images_pkey" PRIMARY KEY (id);

ALTER TABLE public."submissions" ADD CONSTRAINT "submissions_decision_check" CHECK ((decision = ANY (ARRAY['approved'::text, 'approvedWithNotes'::text, 'rejected'::text])));

ALTER TABLE public."submissions" ADD CONSTRAINT "submissions_pkey" PRIMARY KEY (id);

ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_pkey" PRIMARY KEY (id);

ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])));

ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_status_check" CHECK ((status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'done'::text])));

ALTER TABLE public."activities" ADD CONSTRAINT "activities_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."activities" ADD CONSTRAINT "activities_custom_calendar_id_fkey" FOREIGN KEY (custom_calendar_id) REFERENCES custom_calendars(id) ON DELETE SET NULL;

ALTER TABLE public."activities" ADD CONSTRAINT "activities_depends_on_fkey" FOREIGN KEY (depends_on) REFERENCES activities(id) ON DELETE SET NULL;

ALTER TABLE public."activities" ADD CONSTRAINT "activities_linked_contract_id_fkey" FOREIGN KEY (linked_contract_id) REFERENCES contracts(id) ON DELETE SET NULL;

ALTER TABLE public."activities" ADD CONSTRAINT "activities_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES activities(id) ON DELETE CASCADE;

ALTER TABLE public."activities" ADD CONSTRAINT "activities_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE public."approval_chain_steps" ADD CONSTRAINT "approval_chain_steps_acted_by_fkey" FOREIGN KEY (acted_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."approval_chain_steps" ADD CONSTRAINT "approval_chain_steps_assigned_user_id_fkey" FOREIGN KEY (assigned_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."approval_chain_steps" ADD CONSTRAINT "approval_chain_steps_chain_id_fkey" FOREIGN KEY (chain_id) REFERENCES approval_chains(id) ON DELETE CASCADE;

ALTER TABLE public."approval_chain_steps" ADD CONSTRAINT "approval_chain_steps_department_id_fkey" FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE public."approval_chain_steps" ADD CONSTRAINT "approval_chain_steps_inserted_by_fkey" FOREIGN KEY (inserted_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."approval_chain_steps" ADD CONSTRAINT "approval_chain_steps_routed_by_fkey" FOREIGN KEY (routed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."approval_chain_template_steps" ADD CONSTRAINT "approval_chain_template_steps_assigned_user_id_fkey" FOREIGN KEY (assigned_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."approval_chain_template_steps" ADD CONSTRAINT "approval_chain_template_steps_department_id_fkey" FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE public."approval_chain_template_steps" ADD CONSTRAINT "approval_chain_template_steps_template_id_fkey" FOREIGN KEY (template_id) REFERENCES approval_chain_templates(id) ON DELETE CASCADE;

ALTER TABLE public."approval_chain_templates" ADD CONSTRAINT "approval_chain_templates_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."approval_chain_templates" ADD CONSTRAINT "approval_chain_templates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."approval_chains" ADD CONSTRAINT "approval_chains_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."approval_chains" ADD CONSTRAINT "approval_chains_material_request_id_fkey" FOREIGN KEY (material_request_id) REFERENCES material_requests(id) ON DELETE CASCADE;

ALTER TABLE public."audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."audit_log" ADD CONSTRAINT "audit_log_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."audit_log" ADD CONSTRAINT "audit_log_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE public."budget_actual_entries" ADD CONSTRAINT "budget_actual_entries_activity_id_fkey" FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE;

ALTER TABLE public."budget_actual_entries" ADD CONSTRAINT "budget_actual_entries_contract_payment_id_fkey" FOREIGN KEY (contract_payment_id) REFERENCES contract_payments(id) ON DELETE SET NULL;

ALTER TABLE public."budget_actual_entries" ADD CONSTRAINT "budget_actual_entries_finance_reviewed_by_fkey" FOREIGN KEY (finance_reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."budget_actual_entries" ADD CONSTRAINT "budget_actual_entries_pm_reviewed_by_fkey" FOREIGN KEY (pm_reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."budget_actual_entries" ADD CONSTRAINT "budget_actual_entries_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."budget_reconciliation_notes" ADD CONSTRAINT "budget_reconciliation_notes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."budget_reconciliation_notes" ADD CONSTRAINT "budget_reconciliation_notes_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE public."budget_reconciliation_notes" ADD CONSTRAINT "budget_reconciliation_notes_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."checklist_items" ADD CONSTRAINT "checklist_items_activity_id_fkey" FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE;

ALTER TABLE public."checklist_results" ADD CONSTRAINT "checklist_results_checklist_item_id_fkey" FOREIGN KEY (checklist_item_id) REFERENCES checklist_items(id) ON DELETE SET NULL;

ALTER TABLE public."checklist_results" ADD CONSTRAINT "checklist_results_submission_id_fkey" FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE;

ALTER TABLE public."companies" ADD CONSTRAINT "companies_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."companies" ADD CONSTRAINT "companies_subscription_updated_by_fkey" FOREIGN KEY (subscription_updated_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."company_holidays" ADD CONSTRAINT "company_holidays_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."contract_deductions" ADD CONSTRAINT "contract_deductions_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

ALTER TABLE public."contract_deductions" ADD CONSTRAINT "contract_deductions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."contract_extra_works" ADD CONSTRAINT "contract_extra_works_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

ALTER TABLE public."contract_extra_works" ADD CONSTRAINT "contract_extra_works_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."contract_extra_works" ADD CONSTRAINT "contract_extra_works_finance_reviewed_by_fkey" FOREIGN KEY (finance_reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."contract_extra_works" ADD CONSTRAINT "contract_extra_works_pm_reviewed_by_fkey" FOREIGN KEY (pm_reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."contract_extra_works" ADD CONSTRAINT "contract_extra_works_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."contract_line_items" ADD CONSTRAINT "contract_line_items_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

ALTER TABLE public."contract_payments" ADD CONSTRAINT "contract_payments_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

ALTER TABLE public."contract_payments" ADD CONSTRAINT "contract_payments_finance_reviewed_by_fkey" FOREIGN KEY (finance_reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."contract_payments" ADD CONSTRAINT "contract_payments_pm_reviewed_by_fkey" FOREIGN KEY (pm_reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."contract_payments" ADD CONSTRAINT "contract_payments_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."contracts" ADD CONSTRAINT "contracts_finance_reviewed_by_fkey" FOREIGN KEY (finance_reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."contracts" ADD CONSTRAINT "contracts_pm_reviewed_by_fkey" FOREIGN KEY (pm_reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."contracts" ADD CONSTRAINT "contracts_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE public."contracts" ADD CONSTRAINT "contracts_settlement_finance_reviewed_by_fkey" FOREIGN KEY (settlement_finance_reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."contracts" ADD CONSTRAINT "contracts_settlement_pm_reviewed_by_fkey" FOREIGN KEY (settlement_pm_reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."contracts" ADD CONSTRAINT "contracts_settlement_submitted_by_fkey" FOREIGN KEY (settlement_submitted_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."contracts" ADD CONSTRAINT "contracts_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."custom_calendars" ADD CONSTRAINT "custom_calendars_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."department_members" ADD CONSTRAINT "department_members_department_id_fkey" FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE;

ALTER TABLE public."department_members" ADD CONSTRAINT "department_members_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE public."department_members" ADD CONSTRAINT "department_members_job_title_id_fkey" FOREIGN KEY (job_title_id) REFERENCES job_titles(id) ON DELETE SET NULL;

ALTER TABLE public."department_members" ADD CONSTRAINT "department_members_organizational_classification_id_fkey" FOREIGN KEY (organizational_classification_id) REFERENCES organizational_classifications(id) ON DELETE SET NULL;

ALTER TABLE public."department_members" ADD CONSTRAINT "department_members_organizational_level_id_fkey" FOREIGN KEY (organizational_level_id) REFERENCES organizational_levels(id) ON DELETE SET NULL;

ALTER TABLE public."department_members" ADD CONSTRAINT "department_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."departments" ADD CONSTRAINT "departments_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."departments" ADD CONSTRAINT "departments_parent_department_id_fkey" FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE public."document_folders" ADD CONSTRAINT "document_folders_parent_folder_id_fkey" FOREIGN KEY (parent_folder_id) REFERENCES document_folders(id) ON DELETE CASCADE;

ALTER TABLE public."document_folders" ADD CONSTRAINT "document_folders_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE public."documents" ADD CONSTRAINT "documents_folder_id_fkey" FOREIGN KEY (folder_id) REFERENCES document_folders(id) ON DELETE CASCADE;

ALTER TABLE public."employees" ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE public."employees" ADD CONSTRAINT "employees_direct_manager_employee_id_fkey" FOREIGN KEY (direct_manager_employee_id) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE public."employees" ADD CONSTRAINT "employees_job_title_id_fkey" FOREIGN KEY (job_title_id) REFERENCES job_titles(id) ON DELETE SET NULL;

ALTER TABLE public."employees" ADD CONSTRAINT "employees_organizational_classification_id_fkey" FOREIGN KEY (organizational_classification_id) REFERENCES organizational_classifications(id) ON DELETE SET NULL;

ALTER TABLE public."employees" ADD CONSTRAINT "employees_organizational_level_id_fkey" FOREIGN KEY (organizational_level_id) REFERENCES organizational_levels(id) ON DELETE SET NULL;

ALTER TABLE public."employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."internal_approval_chain_steps" ADD CONSTRAINT "internal_approval_chain_steps_acted_by_fkey" FOREIGN KEY (acted_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."internal_approval_chain_steps" ADD CONSTRAINT "internal_approval_chain_steps_assigned_user_id_fkey" FOREIGN KEY (assigned_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."internal_approval_chain_steps" ADD CONSTRAINT "internal_approval_chain_steps_chain_id_fkey" FOREIGN KEY (chain_id) REFERENCES internal_approval_chains(id) ON DELETE CASCADE;

ALTER TABLE public."internal_approval_chain_steps" ADD CONSTRAINT "internal_approval_chain_steps_department_id_fkey" FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE public."internal_approval_chain_steps" ADD CONSTRAINT "internal_approval_chain_steps_inserted_by_fkey" FOREIGN KEY (inserted_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."internal_approval_chain_steps" ADD CONSTRAINT "internal_approval_chain_steps_routed_by_fkey" FOREIGN KEY (routed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."internal_approval_chains" ADD CONSTRAINT "internal_approval_chains_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."internal_approval_chains" ADD CONSTRAINT "internal_approval_chains_internal_request_id_fkey" FOREIGN KEY (internal_request_id) REFERENCES internal_requests(id) ON DELETE CASCADE;

ALTER TABLE public."internal_request_attachment_revisions" ADD CONSTRAINT "internal_request_attachment_revisions_attachment_id_fkey" FOREIGN KEY (attachment_id) REFERENCES internal_request_attachments(id) ON DELETE CASCADE;

ALTER TABLE public."internal_request_attachment_revisions" ADD CONSTRAINT "internal_request_attachment_revisions_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."internal_request_attachments" ADD CONSTRAINT "internal_request_attachments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."internal_request_attachments" ADD CONSTRAINT "internal_request_attachments_request_id_fkey" FOREIGN KEY (request_id) REFERENCES internal_requests(id) ON DELETE CASCADE;

ALTER TABLE public."internal_requests" ADD CONSTRAINT "internal_requests_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."internal_requests" ADD CONSTRAINT "internal_requests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."invites" ADD CONSTRAINT "invites_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."invites" ADD CONSTRAINT "invites_department_id_fkey" FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE;

ALTER TABLE public."invites" ADD CONSTRAINT "invites_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."job_titles" ADD CONSTRAINT "job_titles_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."material_request_attachments" ADD CONSTRAINT "material_request_attachments_material_request_id_fkey" FOREIGN KEY (material_request_id) REFERENCES material_requests(id) ON DELETE CASCADE;

ALTER TABLE public."material_request_attachments" ADD CONSTRAINT "material_request_attachments_option_id_fkey" FOREIGN KEY (option_id) REFERENCES material_request_options(id) ON DELETE CASCADE;

ALTER TABLE public."material_request_attachments" ADD CONSTRAINT "material_request_attachments_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."material_request_options" ADD CONSTRAINT "material_request_options_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."material_request_options" ADD CONSTRAINT "material_request_options_material_request_id_fkey" FOREIGN KEY (material_request_id) REFERENCES material_requests(id) ON DELETE CASCADE;

ALTER TABLE public."material_requests" ADD CONSTRAINT "material_requests_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."material_requests" ADD CONSTRAINT "material_requests_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."organizational_classifications" ADD CONSTRAINT "organizational_classifications_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."organizational_levels" ADD CONSTRAINT "organizational_levels_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."platform_admins" ADD CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE public."project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."projects" ADD CONSTRAINT "projects_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE public."projects" ADD CONSTRAINT "projects_department_id_fkey" FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE public."projects" ADD CONSTRAINT "projects_department_same_company" FOREIGN KEY (department_id, company_id) REFERENCES departments(id, company_id);

ALTER TABLE public."projects" ADD CONSTRAINT "projects_procurement_department_id_fkey" FOREIGN KEY (procurement_department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE public."projects" ADD CONSTRAINT "projects_procurement_department_same_company" FOREIGN KEY (procurement_department_id, company_id) REFERENCES departments(id, company_id);

ALTER TABLE public."submission_images" ADD CONSTRAINT "submission_images_submission_id_fkey" FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE;

ALTER TABLE public."submissions" ADD CONSTRAINT "submissions_activity_id_fkey" FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE;

ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

CREATE INDEX activities_assigned_to_idx ON public.activities USING btree (assigned_to);

CREATE INDEX activities_depends_on_idx ON public.activities USING btree (depends_on);

CREATE INDEX activities_linked_contract_id_idx ON public.activities USING btree (linked_contract_id);

CREATE INDEX activities_parent_id_idx ON public.activities USING btree (parent_id);

CREATE INDEX activities_project_id_idx ON public.activities USING btree (project_id);

CREATE INDEX approval_chain_steps_chain_id_idx ON public.approval_chain_steps USING btree (chain_id);

CREATE INDEX approval_chain_templates_company_id_idx ON public.approval_chain_templates USING btree (company_id);

CREATE INDEX approval_chains_material_request_id_idx ON public.approval_chains USING btree (material_request_id);

CREATE INDEX audit_log_company_id_idx ON public.audit_log USING btree (company_id, created_at DESC);

CREATE INDEX audit_log_record_idx ON public.audit_log USING btree (table_name, record_id, created_at DESC);

CREATE INDEX budget_actual_entries_activity_id_idx ON public.budget_actual_entries USING btree (activity_id);

CREATE INDEX budget_actual_entries_contract_payment_id_idx ON public.budget_actual_entries USING btree (contract_payment_id);

CREATE INDEX budget_reconciliation_notes_project_id_idx ON public.budget_reconciliation_notes USING btree (project_id);

CREATE INDEX checklist_items_activity_id_idx ON public.checklist_items USING btree (activity_id);

CREATE INDEX checklist_results_submission_id_idx ON public.checklist_results USING btree (submission_id);

CREATE INDEX company_holidays_company_id_idx ON public.company_holidays USING btree (company_id);

CREATE INDEX contract_deductions_contract_id_idx ON public.contract_deductions USING btree (contract_id);

CREATE INDEX contract_extra_works_contract_id_idx ON public.contract_extra_works USING btree (contract_id);

CREATE INDEX contract_line_items_contract_id_idx ON public.contract_line_items USING btree (contract_id);

CREATE INDEX contract_payments_contract_id_idx ON public.contract_payments USING btree (contract_id);

CREATE INDEX contracts_project_id_idx ON public.contracts USING btree (project_id);

CREATE INDEX custom_calendars_company_id_idx ON public.custom_calendars USING btree (company_id);

CREATE INDEX department_members_department_id_idx ON public.department_members USING btree (department_id);

CREATE INDEX department_members_employee_id_idx ON public.department_members USING btree (employee_id);

CREATE INDEX department_members_job_title_id_idx ON public.department_members USING btree (job_title_id);

CREATE INDEX department_members_organizational_classification_id_idx ON public.department_members USING btree (organizational_classification_id);

CREATE INDEX department_members_organizational_level_id_idx ON public.department_members USING btree (organizational_level_id);

CREATE INDEX department_members_user_id_idx ON public.department_members USING btree (user_id);

CREATE INDEX departments_company_id_idx ON public.departments USING btree (company_id);

CREATE INDEX departments_parent_department_id_idx ON public.departments USING btree (parent_department_id);

CREATE INDEX document_folders_project_id_idx ON public.document_folders USING btree (project_id);

CREATE INDEX documents_folder_id_idx ON public.documents USING btree (folder_id);

CREATE INDEX employees_company_id_idx ON public.employees USING btree (company_id);

CREATE INDEX employees_department_id_idx ON public.employees USING btree (department_id);

CREATE INDEX employees_direct_manager_employee_id_idx ON public.employees USING btree (direct_manager_employee_id);

CREATE INDEX employees_organizational_level_id_idx ON public.employees USING btree (organizational_level_id);

CREATE INDEX employees_user_id_idx ON public.employees USING btree (user_id);

CREATE INDEX internal_approval_chain_steps_chain_id_idx ON public.internal_approval_chain_steps USING btree (chain_id);

CREATE INDEX internal_approval_chains_request_id_idx ON public.internal_approval_chains USING btree (internal_request_id);

CREATE INDEX internal_request_attachment_revisions_attachment_id_idx ON public.internal_request_attachment_revisions USING btree (attachment_id);

CREATE INDEX internal_request_attachments_request_id_idx ON public.internal_request_attachments USING btree (request_id);

CREATE INDEX internal_requests_company_id_idx ON public.internal_requests USING btree (company_id);

CREATE INDEX internal_requests_user_id_idx ON public.internal_requests USING btree (user_id);

CREATE INDEX invites_company_id_idx ON public.invites USING btree (company_id);

CREATE INDEX job_titles_company_id_idx ON public.job_titles USING btree (company_id);

CREATE INDEX material_request_attachments_material_request_id_idx ON public.material_request_attachments USING btree (material_request_id);

CREATE INDEX material_request_attachments_option_id_idx ON public.material_request_attachments USING btree (option_id);

CREATE INDEX material_request_options_material_request_id_idx ON public.material_request_options USING btree (material_request_id);

CREATE INDEX material_requests_project_id_idx ON public.material_requests USING btree (project_id);

CREATE INDEX notifications_user_id_idx ON public.notifications USING btree (user_id, created_at DESC);

CREATE INDEX organizational_classifications_company_id_idx ON public.organizational_classifications USING btree (company_id);

CREATE INDEX organizational_levels_company_id_idx ON public.organizational_levels USING btree (company_id);

CREATE INDEX project_members_project_id_idx ON public.project_members USING btree (project_id);

CREATE INDEX project_members_user_id_idx ON public.project_members USING btree (user_id);

CREATE INDEX submission_images_submission_id_idx ON public.submission_images USING btree (submission_id);

CREATE INDEX submissions_activity_id_idx ON public.submissions USING btree (activity_id);

CREATE INDEX tasks_assigned_to_idx ON public.tasks USING btree (assigned_to);

CREATE INDEX tasks_project_id_idx ON public.tasks USING btree (project_id);

ALTER TABLE public."activities" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."activities" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."activities" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."approval_chain_steps" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."approval_chain_steps" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."approval_chain_steps" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."approval_chain_template_steps" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."approval_chain_template_steps" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."approval_chain_template_steps" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."approval_chain_templates" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."approval_chain_templates" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."approval_chain_templates" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."approval_chains" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."approval_chains" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."approval_chains" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."audit_log" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."audit_log" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."audit_log" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."budget_actual_entries" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."budget_actual_entries" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."budget_actual_entries" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."budget_reconciliation_notes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."budget_reconciliation_notes" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."budget_reconciliation_notes" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."checklist_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."checklist_items" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."checklist_items" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."checklist_results" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."checklist_results" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."checklist_results" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."companies" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."companies" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."companies" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."company_holidays" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."company_holidays" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."company_holidays" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."contract_deductions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."contract_deductions" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."contract_deductions" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."contract_extra_works" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."contract_extra_works" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."contract_extra_works" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."contract_line_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."contract_line_items" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."contract_line_items" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."contract_payments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."contract_payments" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."contract_payments" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."contracts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."contracts" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."contracts" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."custom_calendars" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."custom_calendars" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."custom_calendars" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."department_members" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."department_members" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."department_members" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."departments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."departments" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."departments" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."document_folders" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."document_folders" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."document_folders" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."documents" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."documents" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."documents" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."employees" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."employees" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."employees" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."internal_approval_chain_steps" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."internal_approval_chain_steps" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."internal_approval_chain_steps" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."internal_approval_chains" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."internal_approval_chains" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."internal_approval_chains" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."internal_request_attachment_revisions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."internal_request_attachment_revisions" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."internal_request_attachment_revisions" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."internal_request_attachments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."internal_request_attachments" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."internal_request_attachments" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."internal_requests" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."internal_requests" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."internal_requests" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."invites" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."invites" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."invites" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."job_titles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."job_titles" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."job_titles" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."material_request_attachments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."material_request_attachments" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."material_request_attachments" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."material_request_options" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."material_request_options" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."material_request_options" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."material_requests" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."material_requests" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."material_requests" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."notifications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."notifications" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."notifications" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."organizational_classifications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."organizational_classifications" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."organizational_classifications" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."organizational_levels" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."organizational_levels" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."organizational_levels" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."platform_admins" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."platform_admins" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."platform_admins" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."profiles" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."profiles" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."project_members" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."project_members" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."project_members" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."projects" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."projects" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."projects" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."submission_images" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."submission_images" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."submission_images" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."submissions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."submissions" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."submissions" FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public."tasks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."tasks" NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."tasks" FROM PUBLIC, anon, authenticated, service_role;

GRANT DELETE ON TABLE public."activities" TO "anon";

GRANT INSERT ON TABLE public."activities" TO "anon";

GRANT REFERENCES ON TABLE public."activities" TO "anon";

GRANT SELECT ON TABLE public."activities" TO "anon";

GRANT TRIGGER ON TABLE public."activities" TO "anon";

GRANT TRUNCATE ON TABLE public."activities" TO "anon";

GRANT UPDATE ON TABLE public."activities" TO "anon";

GRANT DELETE ON TABLE public."activities" TO "authenticated";

GRANT INSERT ON TABLE public."activities" TO "authenticated";

GRANT REFERENCES ON TABLE public."activities" TO "authenticated";

GRANT SELECT ON TABLE public."activities" TO "authenticated";

GRANT TRIGGER ON TABLE public."activities" TO "authenticated";

GRANT TRUNCATE ON TABLE public."activities" TO "authenticated";

GRANT UPDATE ON TABLE public."activities" TO "authenticated";

GRANT DELETE ON TABLE public."activities" TO "service_role";

GRANT INSERT ON TABLE public."activities" TO "service_role";

GRANT REFERENCES ON TABLE public."activities" TO "service_role";

GRANT SELECT ON TABLE public."activities" TO "service_role";

GRANT TRIGGER ON TABLE public."activities" TO "service_role";

GRANT TRUNCATE ON TABLE public."activities" TO "service_role";

GRANT UPDATE ON TABLE public."activities" TO "service_role";

GRANT DELETE ON TABLE public."approval_chain_steps" TO "anon";

GRANT INSERT ON TABLE public."approval_chain_steps" TO "anon";

GRANT REFERENCES ON TABLE public."approval_chain_steps" TO "anon";

GRANT SELECT ON TABLE public."approval_chain_steps" TO "anon";

GRANT TRIGGER ON TABLE public."approval_chain_steps" TO "anon";

GRANT TRUNCATE ON TABLE public."approval_chain_steps" TO "anon";

GRANT UPDATE ON TABLE public."approval_chain_steps" TO "anon";

GRANT DELETE ON TABLE public."approval_chain_steps" TO "authenticated";

GRANT INSERT ON TABLE public."approval_chain_steps" TO "authenticated";

GRANT REFERENCES ON TABLE public."approval_chain_steps" TO "authenticated";

GRANT SELECT ON TABLE public."approval_chain_steps" TO "authenticated";

GRANT TRIGGER ON TABLE public."approval_chain_steps" TO "authenticated";

GRANT TRUNCATE ON TABLE public."approval_chain_steps" TO "authenticated";

GRANT UPDATE ON TABLE public."approval_chain_steps" TO "authenticated";

GRANT DELETE ON TABLE public."approval_chain_steps" TO "service_role";

GRANT INSERT ON TABLE public."approval_chain_steps" TO "service_role";

GRANT REFERENCES ON TABLE public."approval_chain_steps" TO "service_role";

GRANT SELECT ON TABLE public."approval_chain_steps" TO "service_role";

GRANT TRIGGER ON TABLE public."approval_chain_steps" TO "service_role";

GRANT TRUNCATE ON TABLE public."approval_chain_steps" TO "service_role";

GRANT UPDATE ON TABLE public."approval_chain_steps" TO "service_role";

GRANT DELETE ON TABLE public."approval_chain_template_steps" TO "anon";

GRANT INSERT ON TABLE public."approval_chain_template_steps" TO "anon";

GRANT REFERENCES ON TABLE public."approval_chain_template_steps" TO "anon";

GRANT SELECT ON TABLE public."approval_chain_template_steps" TO "anon";

GRANT TRIGGER ON TABLE public."approval_chain_template_steps" TO "anon";

GRANT TRUNCATE ON TABLE public."approval_chain_template_steps" TO "anon";

GRANT UPDATE ON TABLE public."approval_chain_template_steps" TO "anon";

GRANT DELETE ON TABLE public."approval_chain_template_steps" TO "authenticated";

GRANT INSERT ON TABLE public."approval_chain_template_steps" TO "authenticated";

GRANT REFERENCES ON TABLE public."approval_chain_template_steps" TO "authenticated";

GRANT SELECT ON TABLE public."approval_chain_template_steps" TO "authenticated";

GRANT TRIGGER ON TABLE public."approval_chain_template_steps" TO "authenticated";

GRANT TRUNCATE ON TABLE public."approval_chain_template_steps" TO "authenticated";

GRANT UPDATE ON TABLE public."approval_chain_template_steps" TO "authenticated";

GRANT DELETE ON TABLE public."approval_chain_template_steps" TO "service_role";

GRANT INSERT ON TABLE public."approval_chain_template_steps" TO "service_role";

GRANT REFERENCES ON TABLE public."approval_chain_template_steps" TO "service_role";

GRANT SELECT ON TABLE public."approval_chain_template_steps" TO "service_role";

GRANT TRIGGER ON TABLE public."approval_chain_template_steps" TO "service_role";

GRANT TRUNCATE ON TABLE public."approval_chain_template_steps" TO "service_role";

GRANT UPDATE ON TABLE public."approval_chain_template_steps" TO "service_role";

GRANT DELETE ON TABLE public."approval_chain_templates" TO "anon";

GRANT INSERT ON TABLE public."approval_chain_templates" TO "anon";

GRANT REFERENCES ON TABLE public."approval_chain_templates" TO "anon";

GRANT SELECT ON TABLE public."approval_chain_templates" TO "anon";

GRANT TRIGGER ON TABLE public."approval_chain_templates" TO "anon";

GRANT TRUNCATE ON TABLE public."approval_chain_templates" TO "anon";

GRANT UPDATE ON TABLE public."approval_chain_templates" TO "anon";

GRANT DELETE ON TABLE public."approval_chain_templates" TO "authenticated";

GRANT INSERT ON TABLE public."approval_chain_templates" TO "authenticated";

GRANT REFERENCES ON TABLE public."approval_chain_templates" TO "authenticated";

GRANT SELECT ON TABLE public."approval_chain_templates" TO "authenticated";

GRANT TRIGGER ON TABLE public."approval_chain_templates" TO "authenticated";

GRANT TRUNCATE ON TABLE public."approval_chain_templates" TO "authenticated";

GRANT UPDATE ON TABLE public."approval_chain_templates" TO "authenticated";

GRANT DELETE ON TABLE public."approval_chain_templates" TO "service_role";

GRANT INSERT ON TABLE public."approval_chain_templates" TO "service_role";

GRANT REFERENCES ON TABLE public."approval_chain_templates" TO "service_role";

GRANT SELECT ON TABLE public."approval_chain_templates" TO "service_role";

GRANT TRIGGER ON TABLE public."approval_chain_templates" TO "service_role";

GRANT TRUNCATE ON TABLE public."approval_chain_templates" TO "service_role";

GRANT UPDATE ON TABLE public."approval_chain_templates" TO "service_role";

GRANT DELETE ON TABLE public."approval_chains" TO "anon";

GRANT INSERT ON TABLE public."approval_chains" TO "anon";

GRANT REFERENCES ON TABLE public."approval_chains" TO "anon";

GRANT SELECT ON TABLE public."approval_chains" TO "anon";

GRANT TRIGGER ON TABLE public."approval_chains" TO "anon";

GRANT TRUNCATE ON TABLE public."approval_chains" TO "anon";

GRANT UPDATE ON TABLE public."approval_chains" TO "anon";

GRANT DELETE ON TABLE public."approval_chains" TO "authenticated";

GRANT INSERT ON TABLE public."approval_chains" TO "authenticated";

GRANT REFERENCES ON TABLE public."approval_chains" TO "authenticated";

GRANT SELECT ON TABLE public."approval_chains" TO "authenticated";

GRANT TRIGGER ON TABLE public."approval_chains" TO "authenticated";

GRANT TRUNCATE ON TABLE public."approval_chains" TO "authenticated";

GRANT UPDATE ON TABLE public."approval_chains" TO "authenticated";

GRANT DELETE ON TABLE public."approval_chains" TO "service_role";

GRANT INSERT ON TABLE public."approval_chains" TO "service_role";

GRANT REFERENCES ON TABLE public."approval_chains" TO "service_role";

GRANT SELECT ON TABLE public."approval_chains" TO "service_role";

GRANT TRIGGER ON TABLE public."approval_chains" TO "service_role";

GRANT TRUNCATE ON TABLE public."approval_chains" TO "service_role";

GRANT UPDATE ON TABLE public."approval_chains" TO "service_role";

GRANT DELETE ON TABLE public."audit_log" TO "anon";

GRANT INSERT ON TABLE public."audit_log" TO "anon";

GRANT REFERENCES ON TABLE public."audit_log" TO "anon";

GRANT SELECT ON TABLE public."audit_log" TO "anon";

GRANT TRIGGER ON TABLE public."audit_log" TO "anon";

GRANT TRUNCATE ON TABLE public."audit_log" TO "anon";

GRANT UPDATE ON TABLE public."audit_log" TO "anon";

GRANT DELETE ON TABLE public."audit_log" TO "authenticated";

GRANT INSERT ON TABLE public."audit_log" TO "authenticated";

GRANT REFERENCES ON TABLE public."audit_log" TO "authenticated";

GRANT SELECT ON TABLE public."audit_log" TO "authenticated";

GRANT TRIGGER ON TABLE public."audit_log" TO "authenticated";

GRANT TRUNCATE ON TABLE public."audit_log" TO "authenticated";

GRANT UPDATE ON TABLE public."audit_log" TO "authenticated";

GRANT DELETE ON TABLE public."audit_log" TO "service_role";

GRANT INSERT ON TABLE public."audit_log" TO "service_role";

GRANT REFERENCES ON TABLE public."audit_log" TO "service_role";

GRANT SELECT ON TABLE public."audit_log" TO "service_role";

GRANT TRIGGER ON TABLE public."audit_log" TO "service_role";

GRANT TRUNCATE ON TABLE public."audit_log" TO "service_role";

GRANT UPDATE ON TABLE public."audit_log" TO "service_role";

GRANT DELETE ON TABLE public."budget_actual_entries" TO "anon";

GRANT INSERT ON TABLE public."budget_actual_entries" TO "anon";

GRANT REFERENCES ON TABLE public."budget_actual_entries" TO "anon";

GRANT SELECT ON TABLE public."budget_actual_entries" TO "anon";

GRANT TRIGGER ON TABLE public."budget_actual_entries" TO "anon";

GRANT TRUNCATE ON TABLE public."budget_actual_entries" TO "anon";

GRANT UPDATE ON TABLE public."budget_actual_entries" TO "anon";

GRANT DELETE ON TABLE public."budget_actual_entries" TO "authenticated";

GRANT INSERT ON TABLE public."budget_actual_entries" TO "authenticated";

GRANT REFERENCES ON TABLE public."budget_actual_entries" TO "authenticated";

GRANT SELECT ON TABLE public."budget_actual_entries" TO "authenticated";

GRANT TRIGGER ON TABLE public."budget_actual_entries" TO "authenticated";

GRANT TRUNCATE ON TABLE public."budget_actual_entries" TO "authenticated";

GRANT UPDATE ON TABLE public."budget_actual_entries" TO "authenticated";

GRANT DELETE ON TABLE public."budget_actual_entries" TO "service_role";

GRANT INSERT ON TABLE public."budget_actual_entries" TO "service_role";

GRANT REFERENCES ON TABLE public."budget_actual_entries" TO "service_role";

GRANT SELECT ON TABLE public."budget_actual_entries" TO "service_role";

GRANT TRIGGER ON TABLE public."budget_actual_entries" TO "service_role";

GRANT TRUNCATE ON TABLE public."budget_actual_entries" TO "service_role";

GRANT UPDATE ON TABLE public."budget_actual_entries" TO "service_role";

GRANT DELETE ON TABLE public."budget_reconciliation_notes" TO "anon";

GRANT INSERT ON TABLE public."budget_reconciliation_notes" TO "anon";

GRANT REFERENCES ON TABLE public."budget_reconciliation_notes" TO "anon";

GRANT SELECT ON TABLE public."budget_reconciliation_notes" TO "anon";

GRANT TRIGGER ON TABLE public."budget_reconciliation_notes" TO "anon";

GRANT TRUNCATE ON TABLE public."budget_reconciliation_notes" TO "anon";

GRANT UPDATE ON TABLE public."budget_reconciliation_notes" TO "anon";

GRANT DELETE ON TABLE public."budget_reconciliation_notes" TO "authenticated";

GRANT INSERT ON TABLE public."budget_reconciliation_notes" TO "authenticated";

GRANT REFERENCES ON TABLE public."budget_reconciliation_notes" TO "authenticated";

GRANT SELECT ON TABLE public."budget_reconciliation_notes" TO "authenticated";

GRANT TRIGGER ON TABLE public."budget_reconciliation_notes" TO "authenticated";

GRANT TRUNCATE ON TABLE public."budget_reconciliation_notes" TO "authenticated";

GRANT UPDATE ON TABLE public."budget_reconciliation_notes" TO "authenticated";

GRANT DELETE ON TABLE public."budget_reconciliation_notes" TO "service_role";

GRANT INSERT ON TABLE public."budget_reconciliation_notes" TO "service_role";

GRANT REFERENCES ON TABLE public."budget_reconciliation_notes" TO "service_role";

GRANT SELECT ON TABLE public."budget_reconciliation_notes" TO "service_role";

GRANT TRIGGER ON TABLE public."budget_reconciliation_notes" TO "service_role";

GRANT TRUNCATE ON TABLE public."budget_reconciliation_notes" TO "service_role";

GRANT UPDATE ON TABLE public."budget_reconciliation_notes" TO "service_role";

GRANT DELETE ON TABLE public."checklist_items" TO "anon";

GRANT INSERT ON TABLE public."checklist_items" TO "anon";

GRANT REFERENCES ON TABLE public."checklist_items" TO "anon";

GRANT SELECT ON TABLE public."checklist_items" TO "anon";

GRANT TRIGGER ON TABLE public."checklist_items" TO "anon";

GRANT TRUNCATE ON TABLE public."checklist_items" TO "anon";

GRANT UPDATE ON TABLE public."checklist_items" TO "anon";

GRANT DELETE ON TABLE public."checklist_items" TO "authenticated";

GRANT INSERT ON TABLE public."checklist_items" TO "authenticated";

GRANT REFERENCES ON TABLE public."checklist_items" TO "authenticated";

GRANT SELECT ON TABLE public."checklist_items" TO "authenticated";

GRANT TRIGGER ON TABLE public."checklist_items" TO "authenticated";

GRANT TRUNCATE ON TABLE public."checklist_items" TO "authenticated";

GRANT UPDATE ON TABLE public."checklist_items" TO "authenticated";

GRANT DELETE ON TABLE public."checklist_items" TO "service_role";

GRANT INSERT ON TABLE public."checklist_items" TO "service_role";

GRANT REFERENCES ON TABLE public."checklist_items" TO "service_role";

GRANT SELECT ON TABLE public."checklist_items" TO "service_role";

GRANT TRIGGER ON TABLE public."checklist_items" TO "service_role";

GRANT TRUNCATE ON TABLE public."checklist_items" TO "service_role";

GRANT UPDATE ON TABLE public."checklist_items" TO "service_role";

GRANT DELETE ON TABLE public."checklist_results" TO "anon";

GRANT INSERT ON TABLE public."checklist_results" TO "anon";

GRANT REFERENCES ON TABLE public."checklist_results" TO "anon";

GRANT SELECT ON TABLE public."checklist_results" TO "anon";

GRANT TRIGGER ON TABLE public."checklist_results" TO "anon";

GRANT TRUNCATE ON TABLE public."checklist_results" TO "anon";

GRANT UPDATE ON TABLE public."checklist_results" TO "anon";

GRANT DELETE ON TABLE public."checklist_results" TO "authenticated";

GRANT INSERT ON TABLE public."checklist_results" TO "authenticated";

GRANT REFERENCES ON TABLE public."checklist_results" TO "authenticated";

GRANT SELECT ON TABLE public."checklist_results" TO "authenticated";

GRANT TRIGGER ON TABLE public."checklist_results" TO "authenticated";

GRANT TRUNCATE ON TABLE public."checklist_results" TO "authenticated";

GRANT UPDATE ON TABLE public."checklist_results" TO "authenticated";

GRANT DELETE ON TABLE public."checklist_results" TO "service_role";

GRANT INSERT ON TABLE public."checklist_results" TO "service_role";

GRANT REFERENCES ON TABLE public."checklist_results" TO "service_role";

GRANT SELECT ON TABLE public."checklist_results" TO "service_role";

GRANT TRIGGER ON TABLE public."checklist_results" TO "service_role";

GRANT TRUNCATE ON TABLE public."checklist_results" TO "service_role";

GRANT UPDATE ON TABLE public."checklist_results" TO "service_role";

GRANT DELETE ON TABLE public."companies" TO "anon";

GRANT INSERT ON TABLE public."companies" TO "anon";

GRANT REFERENCES ON TABLE public."companies" TO "anon";

GRANT SELECT ON TABLE public."companies" TO "anon";

GRANT TRIGGER ON TABLE public."companies" TO "anon";

GRANT TRUNCATE ON TABLE public."companies" TO "anon";

GRANT UPDATE ON TABLE public."companies" TO "anon";

GRANT DELETE ON TABLE public."companies" TO "authenticated";

GRANT INSERT ON TABLE public."companies" TO "authenticated";

GRANT REFERENCES ON TABLE public."companies" TO "authenticated";

GRANT SELECT ON TABLE public."companies" TO "authenticated";

GRANT TRIGGER ON TABLE public."companies" TO "authenticated";

GRANT TRUNCATE ON TABLE public."companies" TO "authenticated";

GRANT UPDATE ON TABLE public."companies" TO "authenticated";

GRANT DELETE ON TABLE public."companies" TO "service_role";

GRANT INSERT ON TABLE public."companies" TO "service_role";

GRANT REFERENCES ON TABLE public."companies" TO "service_role";

GRANT SELECT ON TABLE public."companies" TO "service_role";

GRANT TRIGGER ON TABLE public."companies" TO "service_role";

GRANT TRUNCATE ON TABLE public."companies" TO "service_role";

GRANT UPDATE ON TABLE public."companies" TO "service_role";

GRANT DELETE ON TABLE public."company_holidays" TO "anon";

GRANT INSERT ON TABLE public."company_holidays" TO "anon";

GRANT REFERENCES ON TABLE public."company_holidays" TO "anon";

GRANT SELECT ON TABLE public."company_holidays" TO "anon";

GRANT TRIGGER ON TABLE public."company_holidays" TO "anon";

GRANT TRUNCATE ON TABLE public."company_holidays" TO "anon";

GRANT UPDATE ON TABLE public."company_holidays" TO "anon";

GRANT DELETE ON TABLE public."company_holidays" TO "authenticated";

GRANT INSERT ON TABLE public."company_holidays" TO "authenticated";

GRANT REFERENCES ON TABLE public."company_holidays" TO "authenticated";

GRANT SELECT ON TABLE public."company_holidays" TO "authenticated";

GRANT TRIGGER ON TABLE public."company_holidays" TO "authenticated";

GRANT TRUNCATE ON TABLE public."company_holidays" TO "authenticated";

GRANT UPDATE ON TABLE public."company_holidays" TO "authenticated";

GRANT DELETE ON TABLE public."company_holidays" TO "service_role";

GRANT INSERT ON TABLE public."company_holidays" TO "service_role";

GRANT REFERENCES ON TABLE public."company_holidays" TO "service_role";

GRANT SELECT ON TABLE public."company_holidays" TO "service_role";

GRANT TRIGGER ON TABLE public."company_holidays" TO "service_role";

GRANT TRUNCATE ON TABLE public."company_holidays" TO "service_role";

GRANT UPDATE ON TABLE public."company_holidays" TO "service_role";

GRANT DELETE ON TABLE public."contract_deductions" TO "anon";

GRANT INSERT ON TABLE public."contract_deductions" TO "anon";

GRANT REFERENCES ON TABLE public."contract_deductions" TO "anon";

GRANT SELECT ON TABLE public."contract_deductions" TO "anon";

GRANT TRIGGER ON TABLE public."contract_deductions" TO "anon";

GRANT TRUNCATE ON TABLE public."contract_deductions" TO "anon";

GRANT UPDATE ON TABLE public."contract_deductions" TO "anon";

GRANT DELETE ON TABLE public."contract_deductions" TO "authenticated";

GRANT INSERT ON TABLE public."contract_deductions" TO "authenticated";

GRANT REFERENCES ON TABLE public."contract_deductions" TO "authenticated";

GRANT SELECT ON TABLE public."contract_deductions" TO "authenticated";

GRANT TRIGGER ON TABLE public."contract_deductions" TO "authenticated";

GRANT TRUNCATE ON TABLE public."contract_deductions" TO "authenticated";

GRANT UPDATE ON TABLE public."contract_deductions" TO "authenticated";

GRANT DELETE ON TABLE public."contract_deductions" TO "service_role";

GRANT INSERT ON TABLE public."contract_deductions" TO "service_role";

GRANT REFERENCES ON TABLE public."contract_deductions" TO "service_role";

GRANT SELECT ON TABLE public."contract_deductions" TO "service_role";

GRANT TRIGGER ON TABLE public."contract_deductions" TO "service_role";

GRANT TRUNCATE ON TABLE public."contract_deductions" TO "service_role";

GRANT UPDATE ON TABLE public."contract_deductions" TO "service_role";

GRANT DELETE ON TABLE public."contract_extra_works" TO "anon";

GRANT INSERT ON TABLE public."contract_extra_works" TO "anon";

GRANT REFERENCES ON TABLE public."contract_extra_works" TO "anon";

GRANT SELECT ON TABLE public."contract_extra_works" TO "anon";

GRANT TRIGGER ON TABLE public."contract_extra_works" TO "anon";

GRANT TRUNCATE ON TABLE public."contract_extra_works" TO "anon";

GRANT UPDATE ON TABLE public."contract_extra_works" TO "anon";

GRANT DELETE ON TABLE public."contract_extra_works" TO "authenticated";

GRANT INSERT ON TABLE public."contract_extra_works" TO "authenticated";

GRANT REFERENCES ON TABLE public."contract_extra_works" TO "authenticated";

GRANT SELECT ON TABLE public."contract_extra_works" TO "authenticated";

GRANT TRIGGER ON TABLE public."contract_extra_works" TO "authenticated";

GRANT TRUNCATE ON TABLE public."contract_extra_works" TO "authenticated";

GRANT UPDATE ON TABLE public."contract_extra_works" TO "authenticated";

GRANT DELETE ON TABLE public."contract_extra_works" TO "service_role";

GRANT INSERT ON TABLE public."contract_extra_works" TO "service_role";

GRANT REFERENCES ON TABLE public."contract_extra_works" TO "service_role";

GRANT SELECT ON TABLE public."contract_extra_works" TO "service_role";

GRANT TRIGGER ON TABLE public."contract_extra_works" TO "service_role";

GRANT TRUNCATE ON TABLE public."contract_extra_works" TO "service_role";

GRANT UPDATE ON TABLE public."contract_extra_works" TO "service_role";

GRANT DELETE ON TABLE public."contract_line_items" TO "anon";

GRANT INSERT ON TABLE public."contract_line_items" TO "anon";

GRANT REFERENCES ON TABLE public."contract_line_items" TO "anon";

GRANT SELECT ON TABLE public."contract_line_items" TO "anon";

GRANT TRIGGER ON TABLE public."contract_line_items" TO "anon";

GRANT TRUNCATE ON TABLE public."contract_line_items" TO "anon";

GRANT UPDATE ON TABLE public."contract_line_items" TO "anon";

GRANT DELETE ON TABLE public."contract_line_items" TO "authenticated";

GRANT INSERT ON TABLE public."contract_line_items" TO "authenticated";

GRANT REFERENCES ON TABLE public."contract_line_items" TO "authenticated";

GRANT SELECT ON TABLE public."contract_line_items" TO "authenticated";

GRANT TRIGGER ON TABLE public."contract_line_items" TO "authenticated";

GRANT TRUNCATE ON TABLE public."contract_line_items" TO "authenticated";

GRANT UPDATE ON TABLE public."contract_line_items" TO "authenticated";

GRANT DELETE ON TABLE public."contract_line_items" TO "service_role";

GRANT INSERT ON TABLE public."contract_line_items" TO "service_role";

GRANT REFERENCES ON TABLE public."contract_line_items" TO "service_role";

GRANT SELECT ON TABLE public."contract_line_items" TO "service_role";

GRANT TRIGGER ON TABLE public."contract_line_items" TO "service_role";

GRANT TRUNCATE ON TABLE public."contract_line_items" TO "service_role";

GRANT UPDATE ON TABLE public."contract_line_items" TO "service_role";

GRANT DELETE ON TABLE public."contract_payments" TO "anon";

GRANT INSERT ON TABLE public."contract_payments" TO "anon";

GRANT REFERENCES ON TABLE public."contract_payments" TO "anon";

GRANT SELECT ON TABLE public."contract_payments" TO "anon";

GRANT TRIGGER ON TABLE public."contract_payments" TO "anon";

GRANT TRUNCATE ON TABLE public."contract_payments" TO "anon";

GRANT UPDATE ON TABLE public."contract_payments" TO "anon";

GRANT DELETE ON TABLE public."contract_payments" TO "authenticated";

GRANT INSERT ON TABLE public."contract_payments" TO "authenticated";

GRANT REFERENCES ON TABLE public."contract_payments" TO "authenticated";

GRANT SELECT ON TABLE public."contract_payments" TO "authenticated";

GRANT TRIGGER ON TABLE public."contract_payments" TO "authenticated";

GRANT TRUNCATE ON TABLE public."contract_payments" TO "authenticated";

GRANT UPDATE ON TABLE public."contract_payments" TO "authenticated";

GRANT DELETE ON TABLE public."contract_payments" TO "service_role";

GRANT INSERT ON TABLE public."contract_payments" TO "service_role";

GRANT REFERENCES ON TABLE public."contract_payments" TO "service_role";

GRANT SELECT ON TABLE public."contract_payments" TO "service_role";

GRANT TRIGGER ON TABLE public."contract_payments" TO "service_role";

GRANT TRUNCATE ON TABLE public."contract_payments" TO "service_role";

GRANT UPDATE ON TABLE public."contract_payments" TO "service_role";

GRANT DELETE ON TABLE public."contracts" TO "anon";

GRANT INSERT ON TABLE public."contracts" TO "anon";

GRANT REFERENCES ON TABLE public."contracts" TO "anon";

GRANT SELECT ON TABLE public."contracts" TO "anon";

GRANT TRIGGER ON TABLE public."contracts" TO "anon";

GRANT TRUNCATE ON TABLE public."contracts" TO "anon";

GRANT UPDATE ON TABLE public."contracts" TO "anon";

GRANT DELETE ON TABLE public."contracts" TO "authenticated";

GRANT INSERT ON TABLE public."contracts" TO "authenticated";

GRANT REFERENCES ON TABLE public."contracts" TO "authenticated";

GRANT SELECT ON TABLE public."contracts" TO "authenticated";

GRANT TRIGGER ON TABLE public."contracts" TO "authenticated";

GRANT TRUNCATE ON TABLE public."contracts" TO "authenticated";

GRANT UPDATE ON TABLE public."contracts" TO "authenticated";

GRANT DELETE ON TABLE public."contracts" TO "service_role";

GRANT INSERT ON TABLE public."contracts" TO "service_role";

GRANT REFERENCES ON TABLE public."contracts" TO "service_role";

GRANT SELECT ON TABLE public."contracts" TO "service_role";

GRANT TRIGGER ON TABLE public."contracts" TO "service_role";

GRANT TRUNCATE ON TABLE public."contracts" TO "service_role";

GRANT UPDATE ON TABLE public."contracts" TO "service_role";

GRANT DELETE ON TABLE public."custom_calendars" TO "anon";

GRANT INSERT ON TABLE public."custom_calendars" TO "anon";

GRANT REFERENCES ON TABLE public."custom_calendars" TO "anon";

GRANT SELECT ON TABLE public."custom_calendars" TO "anon";

GRANT TRIGGER ON TABLE public."custom_calendars" TO "anon";

GRANT TRUNCATE ON TABLE public."custom_calendars" TO "anon";

GRANT UPDATE ON TABLE public."custom_calendars" TO "anon";

GRANT DELETE ON TABLE public."custom_calendars" TO "authenticated";

GRANT INSERT ON TABLE public."custom_calendars" TO "authenticated";

GRANT REFERENCES ON TABLE public."custom_calendars" TO "authenticated";

GRANT SELECT ON TABLE public."custom_calendars" TO "authenticated";

GRANT TRIGGER ON TABLE public."custom_calendars" TO "authenticated";

GRANT TRUNCATE ON TABLE public."custom_calendars" TO "authenticated";

GRANT UPDATE ON TABLE public."custom_calendars" TO "authenticated";

GRANT DELETE ON TABLE public."custom_calendars" TO "service_role";

GRANT INSERT ON TABLE public."custom_calendars" TO "service_role";

GRANT REFERENCES ON TABLE public."custom_calendars" TO "service_role";

GRANT SELECT ON TABLE public."custom_calendars" TO "service_role";

GRANT TRIGGER ON TABLE public."custom_calendars" TO "service_role";

GRANT TRUNCATE ON TABLE public."custom_calendars" TO "service_role";

GRANT UPDATE ON TABLE public."custom_calendars" TO "service_role";

GRANT DELETE ON TABLE public."department_members" TO "anon";

GRANT INSERT ON TABLE public."department_members" TO "anon";

GRANT REFERENCES ON TABLE public."department_members" TO "anon";

GRANT SELECT ON TABLE public."department_members" TO "anon";

GRANT TRIGGER ON TABLE public."department_members" TO "anon";

GRANT TRUNCATE ON TABLE public."department_members" TO "anon";

GRANT UPDATE ON TABLE public."department_members" TO "anon";

GRANT DELETE ON TABLE public."department_members" TO "authenticated";

GRANT INSERT ON TABLE public."department_members" TO "authenticated";

GRANT REFERENCES ON TABLE public."department_members" TO "authenticated";

GRANT SELECT ON TABLE public."department_members" TO "authenticated";

GRANT TRIGGER ON TABLE public."department_members" TO "authenticated";

GRANT TRUNCATE ON TABLE public."department_members" TO "authenticated";

GRANT UPDATE ON TABLE public."department_members" TO "authenticated";

GRANT DELETE ON TABLE public."department_members" TO "service_role";

GRANT INSERT ON TABLE public."department_members" TO "service_role";

GRANT REFERENCES ON TABLE public."department_members" TO "service_role";

GRANT SELECT ON TABLE public."department_members" TO "service_role";

GRANT TRIGGER ON TABLE public."department_members" TO "service_role";

GRANT TRUNCATE ON TABLE public."department_members" TO "service_role";

GRANT UPDATE ON TABLE public."department_members" TO "service_role";

GRANT DELETE ON TABLE public."departments" TO "anon";

GRANT INSERT ON TABLE public."departments" TO "anon";

GRANT REFERENCES ON TABLE public."departments" TO "anon";

GRANT SELECT ON TABLE public."departments" TO "anon";

GRANT TRIGGER ON TABLE public."departments" TO "anon";

GRANT TRUNCATE ON TABLE public."departments" TO "anon";

GRANT UPDATE ON TABLE public."departments" TO "anon";

GRANT DELETE ON TABLE public."departments" TO "authenticated";

GRANT INSERT ON TABLE public."departments" TO "authenticated";

GRANT REFERENCES ON TABLE public."departments" TO "authenticated";

GRANT SELECT ON TABLE public."departments" TO "authenticated";

GRANT TRIGGER ON TABLE public."departments" TO "authenticated";

GRANT TRUNCATE ON TABLE public."departments" TO "authenticated";

GRANT UPDATE ON TABLE public."departments" TO "authenticated";

GRANT DELETE ON TABLE public."departments" TO "service_role";

GRANT INSERT ON TABLE public."departments" TO "service_role";

GRANT REFERENCES ON TABLE public."departments" TO "service_role";

GRANT SELECT ON TABLE public."departments" TO "service_role";

GRANT TRIGGER ON TABLE public."departments" TO "service_role";

GRANT TRUNCATE ON TABLE public."departments" TO "service_role";

GRANT UPDATE ON TABLE public."departments" TO "service_role";

GRANT DELETE ON TABLE public."document_folders" TO "anon";

GRANT INSERT ON TABLE public."document_folders" TO "anon";

GRANT REFERENCES ON TABLE public."document_folders" TO "anon";

GRANT SELECT ON TABLE public."document_folders" TO "anon";

GRANT TRIGGER ON TABLE public."document_folders" TO "anon";

GRANT TRUNCATE ON TABLE public."document_folders" TO "anon";

GRANT UPDATE ON TABLE public."document_folders" TO "anon";

GRANT DELETE ON TABLE public."document_folders" TO "authenticated";

GRANT INSERT ON TABLE public."document_folders" TO "authenticated";

GRANT REFERENCES ON TABLE public."document_folders" TO "authenticated";

GRANT SELECT ON TABLE public."document_folders" TO "authenticated";

GRANT TRIGGER ON TABLE public."document_folders" TO "authenticated";

GRANT TRUNCATE ON TABLE public."document_folders" TO "authenticated";

GRANT UPDATE ON TABLE public."document_folders" TO "authenticated";

GRANT DELETE ON TABLE public."document_folders" TO "service_role";

GRANT INSERT ON TABLE public."document_folders" TO "service_role";

GRANT REFERENCES ON TABLE public."document_folders" TO "service_role";

GRANT SELECT ON TABLE public."document_folders" TO "service_role";

GRANT TRIGGER ON TABLE public."document_folders" TO "service_role";

GRANT TRUNCATE ON TABLE public."document_folders" TO "service_role";

GRANT UPDATE ON TABLE public."document_folders" TO "service_role";

GRANT DELETE ON TABLE public."documents" TO "anon";

GRANT INSERT ON TABLE public."documents" TO "anon";

GRANT REFERENCES ON TABLE public."documents" TO "anon";

GRANT SELECT ON TABLE public."documents" TO "anon";

GRANT TRIGGER ON TABLE public."documents" TO "anon";

GRANT TRUNCATE ON TABLE public."documents" TO "anon";

GRANT UPDATE ON TABLE public."documents" TO "anon";

GRANT DELETE ON TABLE public."documents" TO "authenticated";

GRANT INSERT ON TABLE public."documents" TO "authenticated";

GRANT REFERENCES ON TABLE public."documents" TO "authenticated";

GRANT SELECT ON TABLE public."documents" TO "authenticated";

GRANT TRIGGER ON TABLE public."documents" TO "authenticated";

GRANT TRUNCATE ON TABLE public."documents" TO "authenticated";

GRANT UPDATE ON TABLE public."documents" TO "authenticated";

GRANT DELETE ON TABLE public."documents" TO "service_role";

GRANT INSERT ON TABLE public."documents" TO "service_role";

GRANT REFERENCES ON TABLE public."documents" TO "service_role";

GRANT SELECT ON TABLE public."documents" TO "service_role";

GRANT TRIGGER ON TABLE public."documents" TO "service_role";

GRANT TRUNCATE ON TABLE public."documents" TO "service_role";

GRANT UPDATE ON TABLE public."documents" TO "service_role";

GRANT DELETE ON TABLE public."employees" TO "anon";

GRANT INSERT ON TABLE public."employees" TO "anon";

GRANT REFERENCES ON TABLE public."employees" TO "anon";

GRANT SELECT ON TABLE public."employees" TO "anon";

GRANT TRIGGER ON TABLE public."employees" TO "anon";

GRANT TRUNCATE ON TABLE public."employees" TO "anon";

GRANT UPDATE ON TABLE public."employees" TO "anon";

GRANT DELETE ON TABLE public."employees" TO "authenticated";

GRANT INSERT ON TABLE public."employees" TO "authenticated";

GRANT REFERENCES ON TABLE public."employees" TO "authenticated";

GRANT SELECT ON TABLE public."employees" TO "authenticated";

GRANT TRIGGER ON TABLE public."employees" TO "authenticated";

GRANT TRUNCATE ON TABLE public."employees" TO "authenticated";

GRANT UPDATE ON TABLE public."employees" TO "authenticated";

GRANT DELETE ON TABLE public."employees" TO "service_role";

GRANT INSERT ON TABLE public."employees" TO "service_role";

GRANT REFERENCES ON TABLE public."employees" TO "service_role";

GRANT SELECT ON TABLE public."employees" TO "service_role";

GRANT TRIGGER ON TABLE public."employees" TO "service_role";

GRANT TRUNCATE ON TABLE public."employees" TO "service_role";

GRANT UPDATE ON TABLE public."employees" TO "service_role";

GRANT DELETE ON TABLE public."internal_approval_chain_steps" TO "anon";

GRANT INSERT ON TABLE public."internal_approval_chain_steps" TO "anon";

GRANT REFERENCES ON TABLE public."internal_approval_chain_steps" TO "anon";

GRANT SELECT ON TABLE public."internal_approval_chain_steps" TO "anon";

GRANT TRIGGER ON TABLE public."internal_approval_chain_steps" TO "anon";

GRANT TRUNCATE ON TABLE public."internal_approval_chain_steps" TO "anon";

GRANT UPDATE ON TABLE public."internal_approval_chain_steps" TO "anon";

GRANT DELETE ON TABLE public."internal_approval_chain_steps" TO "authenticated";

GRANT INSERT ON TABLE public."internal_approval_chain_steps" TO "authenticated";

GRANT REFERENCES ON TABLE public."internal_approval_chain_steps" TO "authenticated";

GRANT SELECT ON TABLE public."internal_approval_chain_steps" TO "authenticated";

GRANT TRIGGER ON TABLE public."internal_approval_chain_steps" TO "authenticated";

GRANT TRUNCATE ON TABLE public."internal_approval_chain_steps" TO "authenticated";

GRANT UPDATE ON TABLE public."internal_approval_chain_steps" TO "authenticated";

GRANT DELETE ON TABLE public."internal_approval_chain_steps" TO "service_role";

GRANT INSERT ON TABLE public."internal_approval_chain_steps" TO "service_role";

GRANT REFERENCES ON TABLE public."internal_approval_chain_steps" TO "service_role";

GRANT SELECT ON TABLE public."internal_approval_chain_steps" TO "service_role";

GRANT TRIGGER ON TABLE public."internal_approval_chain_steps" TO "service_role";

GRANT TRUNCATE ON TABLE public."internal_approval_chain_steps" TO "service_role";

GRANT UPDATE ON TABLE public."internal_approval_chain_steps" TO "service_role";

GRANT DELETE ON TABLE public."internal_approval_chains" TO "anon";

GRANT INSERT ON TABLE public."internal_approval_chains" TO "anon";

GRANT REFERENCES ON TABLE public."internal_approval_chains" TO "anon";

GRANT SELECT ON TABLE public."internal_approval_chains" TO "anon";

GRANT TRIGGER ON TABLE public."internal_approval_chains" TO "anon";

GRANT TRUNCATE ON TABLE public."internal_approval_chains" TO "anon";

GRANT UPDATE ON TABLE public."internal_approval_chains" TO "anon";

GRANT DELETE ON TABLE public."internal_approval_chains" TO "authenticated";

GRANT INSERT ON TABLE public."internal_approval_chains" TO "authenticated";

GRANT REFERENCES ON TABLE public."internal_approval_chains" TO "authenticated";

GRANT SELECT ON TABLE public."internal_approval_chains" TO "authenticated";

GRANT TRIGGER ON TABLE public."internal_approval_chains" TO "authenticated";

GRANT TRUNCATE ON TABLE public."internal_approval_chains" TO "authenticated";

GRANT UPDATE ON TABLE public."internal_approval_chains" TO "authenticated";

GRANT DELETE ON TABLE public."internal_approval_chains" TO "service_role";

GRANT INSERT ON TABLE public."internal_approval_chains" TO "service_role";

GRANT REFERENCES ON TABLE public."internal_approval_chains" TO "service_role";

GRANT SELECT ON TABLE public."internal_approval_chains" TO "service_role";

GRANT TRIGGER ON TABLE public."internal_approval_chains" TO "service_role";

GRANT TRUNCATE ON TABLE public."internal_approval_chains" TO "service_role";

GRANT UPDATE ON TABLE public."internal_approval_chains" TO "service_role";

GRANT DELETE ON TABLE public."internal_request_attachment_revisions" TO "anon";

GRANT INSERT ON TABLE public."internal_request_attachment_revisions" TO "anon";

GRANT REFERENCES ON TABLE public."internal_request_attachment_revisions" TO "anon";

GRANT SELECT ON TABLE public."internal_request_attachment_revisions" TO "anon";

GRANT TRIGGER ON TABLE public."internal_request_attachment_revisions" TO "anon";

GRANT TRUNCATE ON TABLE public."internal_request_attachment_revisions" TO "anon";

GRANT UPDATE ON TABLE public."internal_request_attachment_revisions" TO "anon";

GRANT DELETE ON TABLE public."internal_request_attachment_revisions" TO "authenticated";

GRANT INSERT ON TABLE public."internal_request_attachment_revisions" TO "authenticated";

GRANT REFERENCES ON TABLE public."internal_request_attachment_revisions" TO "authenticated";

GRANT SELECT ON TABLE public."internal_request_attachment_revisions" TO "authenticated";

GRANT TRIGGER ON TABLE public."internal_request_attachment_revisions" TO "authenticated";

GRANT TRUNCATE ON TABLE public."internal_request_attachment_revisions" TO "authenticated";

GRANT UPDATE ON TABLE public."internal_request_attachment_revisions" TO "authenticated";

GRANT DELETE ON TABLE public."internal_request_attachment_revisions" TO "service_role";

GRANT INSERT ON TABLE public."internal_request_attachment_revisions" TO "service_role";

GRANT REFERENCES ON TABLE public."internal_request_attachment_revisions" TO "service_role";

GRANT SELECT ON TABLE public."internal_request_attachment_revisions" TO "service_role";

GRANT TRIGGER ON TABLE public."internal_request_attachment_revisions" TO "service_role";

GRANT TRUNCATE ON TABLE public."internal_request_attachment_revisions" TO "service_role";

GRANT UPDATE ON TABLE public."internal_request_attachment_revisions" TO "service_role";

GRANT DELETE ON TABLE public."internal_request_attachments" TO "anon";

GRANT INSERT ON TABLE public."internal_request_attachments" TO "anon";

GRANT REFERENCES ON TABLE public."internal_request_attachments" TO "anon";

GRANT SELECT ON TABLE public."internal_request_attachments" TO "anon";

GRANT TRIGGER ON TABLE public."internal_request_attachments" TO "anon";

GRANT TRUNCATE ON TABLE public."internal_request_attachments" TO "anon";

GRANT UPDATE ON TABLE public."internal_request_attachments" TO "anon";

GRANT DELETE ON TABLE public."internal_request_attachments" TO "authenticated";

GRANT INSERT ON TABLE public."internal_request_attachments" TO "authenticated";

GRANT REFERENCES ON TABLE public."internal_request_attachments" TO "authenticated";

GRANT SELECT ON TABLE public."internal_request_attachments" TO "authenticated";

GRANT TRIGGER ON TABLE public."internal_request_attachments" TO "authenticated";

GRANT TRUNCATE ON TABLE public."internal_request_attachments" TO "authenticated";

GRANT UPDATE ON TABLE public."internal_request_attachments" TO "authenticated";

GRANT DELETE ON TABLE public."internal_request_attachments" TO "service_role";

GRANT INSERT ON TABLE public."internal_request_attachments" TO "service_role";

GRANT REFERENCES ON TABLE public."internal_request_attachments" TO "service_role";

GRANT SELECT ON TABLE public."internal_request_attachments" TO "service_role";

GRANT TRIGGER ON TABLE public."internal_request_attachments" TO "service_role";

GRANT TRUNCATE ON TABLE public."internal_request_attachments" TO "service_role";

GRANT UPDATE ON TABLE public."internal_request_attachments" TO "service_role";

GRANT DELETE ON TABLE public."internal_requests" TO "anon";

GRANT INSERT ON TABLE public."internal_requests" TO "anon";

GRANT REFERENCES ON TABLE public."internal_requests" TO "anon";

GRANT SELECT ON TABLE public."internal_requests" TO "anon";

GRANT TRIGGER ON TABLE public."internal_requests" TO "anon";

GRANT TRUNCATE ON TABLE public."internal_requests" TO "anon";

GRANT UPDATE ON TABLE public."internal_requests" TO "anon";

GRANT DELETE ON TABLE public."internal_requests" TO "authenticated";

GRANT INSERT ON TABLE public."internal_requests" TO "authenticated";

GRANT REFERENCES ON TABLE public."internal_requests" TO "authenticated";

GRANT SELECT ON TABLE public."internal_requests" TO "authenticated";

GRANT TRIGGER ON TABLE public."internal_requests" TO "authenticated";

GRANT TRUNCATE ON TABLE public."internal_requests" TO "authenticated";

GRANT UPDATE ON TABLE public."internal_requests" TO "authenticated";

GRANT DELETE ON TABLE public."internal_requests" TO "service_role";

GRANT INSERT ON TABLE public."internal_requests" TO "service_role";

GRANT REFERENCES ON TABLE public."internal_requests" TO "service_role";

GRANT SELECT ON TABLE public."internal_requests" TO "service_role";

GRANT TRIGGER ON TABLE public."internal_requests" TO "service_role";

GRANT TRUNCATE ON TABLE public."internal_requests" TO "service_role";

GRANT UPDATE ON TABLE public."internal_requests" TO "service_role";

GRANT DELETE ON TABLE public."invites" TO "anon";

GRANT INSERT ON TABLE public."invites" TO "anon";

GRANT REFERENCES ON TABLE public."invites" TO "anon";

GRANT SELECT ON TABLE public."invites" TO "anon";

GRANT TRIGGER ON TABLE public."invites" TO "anon";

GRANT TRUNCATE ON TABLE public."invites" TO "anon";

GRANT UPDATE ON TABLE public."invites" TO "anon";

GRANT DELETE ON TABLE public."invites" TO "authenticated";

GRANT INSERT ON TABLE public."invites" TO "authenticated";

GRANT REFERENCES ON TABLE public."invites" TO "authenticated";

GRANT SELECT ON TABLE public."invites" TO "authenticated";

GRANT TRIGGER ON TABLE public."invites" TO "authenticated";

GRANT TRUNCATE ON TABLE public."invites" TO "authenticated";

GRANT UPDATE ON TABLE public."invites" TO "authenticated";

GRANT DELETE ON TABLE public."invites" TO "service_role";

GRANT INSERT ON TABLE public."invites" TO "service_role";

GRANT REFERENCES ON TABLE public."invites" TO "service_role";

GRANT SELECT ON TABLE public."invites" TO "service_role";

GRANT TRIGGER ON TABLE public."invites" TO "service_role";

GRANT TRUNCATE ON TABLE public."invites" TO "service_role";

GRANT UPDATE ON TABLE public."invites" TO "service_role";

GRANT DELETE ON TABLE public."job_titles" TO "anon";

GRANT INSERT ON TABLE public."job_titles" TO "anon";

GRANT REFERENCES ON TABLE public."job_titles" TO "anon";

GRANT SELECT ON TABLE public."job_titles" TO "anon";

GRANT TRIGGER ON TABLE public."job_titles" TO "anon";

GRANT TRUNCATE ON TABLE public."job_titles" TO "anon";

GRANT UPDATE ON TABLE public."job_titles" TO "anon";

GRANT DELETE ON TABLE public."job_titles" TO "authenticated";

GRANT INSERT ON TABLE public."job_titles" TO "authenticated";

GRANT REFERENCES ON TABLE public."job_titles" TO "authenticated";

GRANT SELECT ON TABLE public."job_titles" TO "authenticated";

GRANT TRIGGER ON TABLE public."job_titles" TO "authenticated";

GRANT TRUNCATE ON TABLE public."job_titles" TO "authenticated";

GRANT UPDATE ON TABLE public."job_titles" TO "authenticated";

GRANT DELETE ON TABLE public."job_titles" TO "service_role";

GRANT INSERT ON TABLE public."job_titles" TO "service_role";

GRANT REFERENCES ON TABLE public."job_titles" TO "service_role";

GRANT SELECT ON TABLE public."job_titles" TO "service_role";

GRANT TRIGGER ON TABLE public."job_titles" TO "service_role";

GRANT TRUNCATE ON TABLE public."job_titles" TO "service_role";

GRANT UPDATE ON TABLE public."job_titles" TO "service_role";

GRANT DELETE ON TABLE public."material_request_attachments" TO "anon";

GRANT INSERT ON TABLE public."material_request_attachments" TO "anon";

GRANT REFERENCES ON TABLE public."material_request_attachments" TO "anon";

GRANT SELECT ON TABLE public."material_request_attachments" TO "anon";

GRANT TRIGGER ON TABLE public."material_request_attachments" TO "anon";

GRANT TRUNCATE ON TABLE public."material_request_attachments" TO "anon";

GRANT UPDATE ON TABLE public."material_request_attachments" TO "anon";

GRANT DELETE ON TABLE public."material_request_attachments" TO "authenticated";

GRANT INSERT ON TABLE public."material_request_attachments" TO "authenticated";

GRANT REFERENCES ON TABLE public."material_request_attachments" TO "authenticated";

GRANT SELECT ON TABLE public."material_request_attachments" TO "authenticated";

GRANT TRIGGER ON TABLE public."material_request_attachments" TO "authenticated";

GRANT TRUNCATE ON TABLE public."material_request_attachments" TO "authenticated";

GRANT UPDATE ON TABLE public."material_request_attachments" TO "authenticated";

GRANT DELETE ON TABLE public."material_request_attachments" TO "service_role";

GRANT INSERT ON TABLE public."material_request_attachments" TO "service_role";

GRANT REFERENCES ON TABLE public."material_request_attachments" TO "service_role";

GRANT SELECT ON TABLE public."material_request_attachments" TO "service_role";

GRANT TRIGGER ON TABLE public."material_request_attachments" TO "service_role";

GRANT TRUNCATE ON TABLE public."material_request_attachments" TO "service_role";

GRANT UPDATE ON TABLE public."material_request_attachments" TO "service_role";

GRANT DELETE ON TABLE public."material_request_options" TO "anon";

GRANT INSERT ON TABLE public."material_request_options" TO "anon";

GRANT REFERENCES ON TABLE public."material_request_options" TO "anon";

GRANT SELECT ON TABLE public."material_request_options" TO "anon";

GRANT TRIGGER ON TABLE public."material_request_options" TO "anon";

GRANT TRUNCATE ON TABLE public."material_request_options" TO "anon";

GRANT UPDATE ON TABLE public."material_request_options" TO "anon";

GRANT DELETE ON TABLE public."material_request_options" TO "authenticated";

GRANT INSERT ON TABLE public."material_request_options" TO "authenticated";

GRANT REFERENCES ON TABLE public."material_request_options" TO "authenticated";

GRANT SELECT ON TABLE public."material_request_options" TO "authenticated";

GRANT TRIGGER ON TABLE public."material_request_options" TO "authenticated";

GRANT TRUNCATE ON TABLE public."material_request_options" TO "authenticated";

GRANT UPDATE ON TABLE public."material_request_options" TO "authenticated";

GRANT DELETE ON TABLE public."material_request_options" TO "service_role";

GRANT INSERT ON TABLE public."material_request_options" TO "service_role";

GRANT REFERENCES ON TABLE public."material_request_options" TO "service_role";

GRANT SELECT ON TABLE public."material_request_options" TO "service_role";

GRANT TRIGGER ON TABLE public."material_request_options" TO "service_role";

GRANT TRUNCATE ON TABLE public."material_request_options" TO "service_role";

GRANT UPDATE ON TABLE public."material_request_options" TO "service_role";

GRANT DELETE ON TABLE public."material_requests" TO "anon";

GRANT INSERT ON TABLE public."material_requests" TO "anon";

GRANT REFERENCES ON TABLE public."material_requests" TO "anon";

GRANT SELECT ON TABLE public."material_requests" TO "anon";

GRANT TRIGGER ON TABLE public."material_requests" TO "anon";

GRANT TRUNCATE ON TABLE public."material_requests" TO "anon";

GRANT UPDATE ON TABLE public."material_requests" TO "anon";

GRANT DELETE ON TABLE public."material_requests" TO "authenticated";

GRANT INSERT ON TABLE public."material_requests" TO "authenticated";

GRANT REFERENCES ON TABLE public."material_requests" TO "authenticated";

GRANT SELECT ON TABLE public."material_requests" TO "authenticated";

GRANT TRIGGER ON TABLE public."material_requests" TO "authenticated";

GRANT TRUNCATE ON TABLE public."material_requests" TO "authenticated";

GRANT UPDATE ON TABLE public."material_requests" TO "authenticated";

GRANT DELETE ON TABLE public."material_requests" TO "service_role";

GRANT INSERT ON TABLE public."material_requests" TO "service_role";

GRANT REFERENCES ON TABLE public."material_requests" TO "service_role";

GRANT SELECT ON TABLE public."material_requests" TO "service_role";

GRANT TRIGGER ON TABLE public."material_requests" TO "service_role";

GRANT TRUNCATE ON TABLE public."material_requests" TO "service_role";

GRANT UPDATE ON TABLE public."material_requests" TO "service_role";

GRANT DELETE ON TABLE public."notifications" TO "anon";

GRANT INSERT ON TABLE public."notifications" TO "anon";

GRANT REFERENCES ON TABLE public."notifications" TO "anon";

GRANT SELECT ON TABLE public."notifications" TO "anon";

GRANT TRIGGER ON TABLE public."notifications" TO "anon";

GRANT TRUNCATE ON TABLE public."notifications" TO "anon";

GRANT UPDATE ON TABLE public."notifications" TO "anon";

GRANT DELETE ON TABLE public."notifications" TO "authenticated";

GRANT INSERT ON TABLE public."notifications" TO "authenticated";

GRANT REFERENCES ON TABLE public."notifications" TO "authenticated";

GRANT SELECT ON TABLE public."notifications" TO "authenticated";

GRANT TRIGGER ON TABLE public."notifications" TO "authenticated";

GRANT TRUNCATE ON TABLE public."notifications" TO "authenticated";

GRANT UPDATE ON TABLE public."notifications" TO "authenticated";

GRANT DELETE ON TABLE public."notifications" TO "service_role";

GRANT INSERT ON TABLE public."notifications" TO "service_role";

GRANT REFERENCES ON TABLE public."notifications" TO "service_role";

GRANT SELECT ON TABLE public."notifications" TO "service_role";

GRANT TRIGGER ON TABLE public."notifications" TO "service_role";

GRANT TRUNCATE ON TABLE public."notifications" TO "service_role";

GRANT UPDATE ON TABLE public."notifications" TO "service_role";

GRANT DELETE ON TABLE public."organizational_classifications" TO "anon";

GRANT INSERT ON TABLE public."organizational_classifications" TO "anon";

GRANT REFERENCES ON TABLE public."organizational_classifications" TO "anon";

GRANT SELECT ON TABLE public."organizational_classifications" TO "anon";

GRANT TRIGGER ON TABLE public."organizational_classifications" TO "anon";

GRANT TRUNCATE ON TABLE public."organizational_classifications" TO "anon";

GRANT UPDATE ON TABLE public."organizational_classifications" TO "anon";

GRANT DELETE ON TABLE public."organizational_classifications" TO "authenticated";

GRANT INSERT ON TABLE public."organizational_classifications" TO "authenticated";

GRANT REFERENCES ON TABLE public."organizational_classifications" TO "authenticated";

GRANT SELECT ON TABLE public."organizational_classifications" TO "authenticated";

GRANT TRIGGER ON TABLE public."organizational_classifications" TO "authenticated";

GRANT TRUNCATE ON TABLE public."organizational_classifications" TO "authenticated";

GRANT UPDATE ON TABLE public."organizational_classifications" TO "authenticated";

GRANT DELETE ON TABLE public."organizational_classifications" TO "service_role";

GRANT INSERT ON TABLE public."organizational_classifications" TO "service_role";

GRANT REFERENCES ON TABLE public."organizational_classifications" TO "service_role";

GRANT SELECT ON TABLE public."organizational_classifications" TO "service_role";

GRANT TRIGGER ON TABLE public."organizational_classifications" TO "service_role";

GRANT TRUNCATE ON TABLE public."organizational_classifications" TO "service_role";

GRANT UPDATE ON TABLE public."organizational_classifications" TO "service_role";

GRANT DELETE ON TABLE public."organizational_levels" TO "anon";

GRANT INSERT ON TABLE public."organizational_levels" TO "anon";

GRANT REFERENCES ON TABLE public."organizational_levels" TO "anon";

GRANT SELECT ON TABLE public."organizational_levels" TO "anon";

GRANT TRIGGER ON TABLE public."organizational_levels" TO "anon";

GRANT TRUNCATE ON TABLE public."organizational_levels" TO "anon";

GRANT UPDATE ON TABLE public."organizational_levels" TO "anon";

GRANT DELETE ON TABLE public."organizational_levels" TO "authenticated";

GRANT INSERT ON TABLE public."organizational_levels" TO "authenticated";

GRANT REFERENCES ON TABLE public."organizational_levels" TO "authenticated";

GRANT SELECT ON TABLE public."organizational_levels" TO "authenticated";

GRANT TRIGGER ON TABLE public."organizational_levels" TO "authenticated";

GRANT TRUNCATE ON TABLE public."organizational_levels" TO "authenticated";

GRANT UPDATE ON TABLE public."organizational_levels" TO "authenticated";

GRANT DELETE ON TABLE public."organizational_levels" TO "service_role";

GRANT INSERT ON TABLE public."organizational_levels" TO "service_role";

GRANT REFERENCES ON TABLE public."organizational_levels" TO "service_role";

GRANT SELECT ON TABLE public."organizational_levels" TO "service_role";

GRANT TRIGGER ON TABLE public."organizational_levels" TO "service_role";

GRANT TRUNCATE ON TABLE public."organizational_levels" TO "service_role";

GRANT UPDATE ON TABLE public."organizational_levels" TO "service_role";

GRANT DELETE ON TABLE public."platform_admins" TO "anon";

GRANT INSERT ON TABLE public."platform_admins" TO "anon";

GRANT REFERENCES ON TABLE public."platform_admins" TO "anon";

GRANT SELECT ON TABLE public."platform_admins" TO "anon";

GRANT TRIGGER ON TABLE public."platform_admins" TO "anon";

GRANT TRUNCATE ON TABLE public."platform_admins" TO "anon";

GRANT UPDATE ON TABLE public."platform_admins" TO "anon";

GRANT DELETE ON TABLE public."platform_admins" TO "authenticated";

GRANT INSERT ON TABLE public."platform_admins" TO "authenticated";

GRANT REFERENCES ON TABLE public."platform_admins" TO "authenticated";

GRANT SELECT ON TABLE public."platform_admins" TO "authenticated";

GRANT TRIGGER ON TABLE public."platform_admins" TO "authenticated";

GRANT TRUNCATE ON TABLE public."platform_admins" TO "authenticated";

GRANT UPDATE ON TABLE public."platform_admins" TO "authenticated";

GRANT DELETE ON TABLE public."platform_admins" TO "service_role";

GRANT INSERT ON TABLE public."platform_admins" TO "service_role";

GRANT REFERENCES ON TABLE public."platform_admins" TO "service_role";

GRANT SELECT ON TABLE public."platform_admins" TO "service_role";

GRANT TRIGGER ON TABLE public."platform_admins" TO "service_role";

GRANT TRUNCATE ON TABLE public."platform_admins" TO "service_role";

GRANT UPDATE ON TABLE public."platform_admins" TO "service_role";

GRANT DELETE ON TABLE public."profiles" TO "anon";

GRANT INSERT ON TABLE public."profiles" TO "anon";

GRANT REFERENCES ON TABLE public."profiles" TO "anon";

GRANT SELECT ON TABLE public."profiles" TO "anon";

GRANT TRIGGER ON TABLE public."profiles" TO "anon";

GRANT TRUNCATE ON TABLE public."profiles" TO "anon";

GRANT UPDATE ON TABLE public."profiles" TO "anon";

GRANT DELETE ON TABLE public."profiles" TO "authenticated";

GRANT INSERT ON TABLE public."profiles" TO "authenticated";

GRANT REFERENCES ON TABLE public."profiles" TO "authenticated";

GRANT SELECT ON TABLE public."profiles" TO "authenticated";

GRANT TRIGGER ON TABLE public."profiles" TO "authenticated";

GRANT TRUNCATE ON TABLE public."profiles" TO "authenticated";

GRANT UPDATE ON TABLE public."profiles" TO "authenticated";

GRANT DELETE ON TABLE public."profiles" TO "service_role";

GRANT INSERT ON TABLE public."profiles" TO "service_role";

GRANT REFERENCES ON TABLE public."profiles" TO "service_role";

GRANT SELECT ON TABLE public."profiles" TO "service_role";

GRANT TRIGGER ON TABLE public."profiles" TO "service_role";

GRANT TRUNCATE ON TABLE public."profiles" TO "service_role";

GRANT UPDATE ON TABLE public."profiles" TO "service_role";

GRANT DELETE ON TABLE public."project_members" TO "anon";

GRANT INSERT ON TABLE public."project_members" TO "anon";

GRANT REFERENCES ON TABLE public."project_members" TO "anon";

GRANT SELECT ON TABLE public."project_members" TO "anon";

GRANT TRIGGER ON TABLE public."project_members" TO "anon";

GRANT TRUNCATE ON TABLE public."project_members" TO "anon";

GRANT UPDATE ON TABLE public."project_members" TO "anon";

GRANT DELETE ON TABLE public."project_members" TO "authenticated";

GRANT INSERT ON TABLE public."project_members" TO "authenticated";

GRANT REFERENCES ON TABLE public."project_members" TO "authenticated";

GRANT SELECT ON TABLE public."project_members" TO "authenticated";

GRANT TRIGGER ON TABLE public."project_members" TO "authenticated";

GRANT TRUNCATE ON TABLE public."project_members" TO "authenticated";

GRANT UPDATE ON TABLE public."project_members" TO "authenticated";

GRANT DELETE ON TABLE public."project_members" TO "service_role";

GRANT INSERT ON TABLE public."project_members" TO "service_role";

GRANT REFERENCES ON TABLE public."project_members" TO "service_role";

GRANT SELECT ON TABLE public."project_members" TO "service_role";

GRANT TRIGGER ON TABLE public."project_members" TO "service_role";

GRANT TRUNCATE ON TABLE public."project_members" TO "service_role";

GRANT UPDATE ON TABLE public."project_members" TO "service_role";

GRANT DELETE ON TABLE public."projects" TO "anon";

GRANT INSERT ON TABLE public."projects" TO "anon";

GRANT REFERENCES ON TABLE public."projects" TO "anon";

GRANT SELECT ON TABLE public."projects" TO "anon";

GRANT TRIGGER ON TABLE public."projects" TO "anon";

GRANT TRUNCATE ON TABLE public."projects" TO "anon";

GRANT UPDATE ON TABLE public."projects" TO "anon";

GRANT DELETE ON TABLE public."projects" TO "authenticated";

GRANT INSERT ON TABLE public."projects" TO "authenticated";

GRANT REFERENCES ON TABLE public."projects" TO "authenticated";

GRANT SELECT ON TABLE public."projects" TO "authenticated";

GRANT TRIGGER ON TABLE public."projects" TO "authenticated";

GRANT TRUNCATE ON TABLE public."projects" TO "authenticated";

GRANT UPDATE ON TABLE public."projects" TO "authenticated";

GRANT DELETE ON TABLE public."projects" TO "service_role";

GRANT INSERT ON TABLE public."projects" TO "service_role";

GRANT REFERENCES ON TABLE public."projects" TO "service_role";

GRANT SELECT ON TABLE public."projects" TO "service_role";

GRANT TRIGGER ON TABLE public."projects" TO "service_role";

GRANT TRUNCATE ON TABLE public."projects" TO "service_role";

GRANT UPDATE ON TABLE public."projects" TO "service_role";

GRANT DELETE ON TABLE public."submission_images" TO "anon";

GRANT INSERT ON TABLE public."submission_images" TO "anon";

GRANT REFERENCES ON TABLE public."submission_images" TO "anon";

GRANT SELECT ON TABLE public."submission_images" TO "anon";

GRANT TRIGGER ON TABLE public."submission_images" TO "anon";

GRANT TRUNCATE ON TABLE public."submission_images" TO "anon";

GRANT UPDATE ON TABLE public."submission_images" TO "anon";

GRANT DELETE ON TABLE public."submission_images" TO "authenticated";

GRANT INSERT ON TABLE public."submission_images" TO "authenticated";

GRANT REFERENCES ON TABLE public."submission_images" TO "authenticated";

GRANT SELECT ON TABLE public."submission_images" TO "authenticated";

GRANT TRIGGER ON TABLE public."submission_images" TO "authenticated";

GRANT TRUNCATE ON TABLE public."submission_images" TO "authenticated";

GRANT UPDATE ON TABLE public."submission_images" TO "authenticated";

GRANT DELETE ON TABLE public."submission_images" TO "service_role";

GRANT INSERT ON TABLE public."submission_images" TO "service_role";

GRANT REFERENCES ON TABLE public."submission_images" TO "service_role";

GRANT SELECT ON TABLE public."submission_images" TO "service_role";

GRANT TRIGGER ON TABLE public."submission_images" TO "service_role";

GRANT TRUNCATE ON TABLE public."submission_images" TO "service_role";

GRANT UPDATE ON TABLE public."submission_images" TO "service_role";

GRANT DELETE ON TABLE public."submissions" TO "anon";

GRANT INSERT ON TABLE public."submissions" TO "anon";

GRANT REFERENCES ON TABLE public."submissions" TO "anon";

GRANT SELECT ON TABLE public."submissions" TO "anon";

GRANT TRIGGER ON TABLE public."submissions" TO "anon";

GRANT TRUNCATE ON TABLE public."submissions" TO "anon";

GRANT UPDATE ON TABLE public."submissions" TO "anon";

GRANT DELETE ON TABLE public."submissions" TO "authenticated";

GRANT INSERT ON TABLE public."submissions" TO "authenticated";

GRANT REFERENCES ON TABLE public."submissions" TO "authenticated";

GRANT SELECT ON TABLE public."submissions" TO "authenticated";

GRANT TRIGGER ON TABLE public."submissions" TO "authenticated";

GRANT TRUNCATE ON TABLE public."submissions" TO "authenticated";

GRANT UPDATE ON TABLE public."submissions" TO "authenticated";

GRANT DELETE ON TABLE public."submissions" TO "service_role";

GRANT INSERT ON TABLE public."submissions" TO "service_role";

GRANT REFERENCES ON TABLE public."submissions" TO "service_role";

GRANT SELECT ON TABLE public."submissions" TO "service_role";

GRANT TRIGGER ON TABLE public."submissions" TO "service_role";

GRANT TRUNCATE ON TABLE public."submissions" TO "service_role";

GRANT UPDATE ON TABLE public."submissions" TO "service_role";

GRANT DELETE ON TABLE public."tasks" TO "anon";

GRANT INSERT ON TABLE public."tasks" TO "anon";

GRANT REFERENCES ON TABLE public."tasks" TO "anon";

GRANT SELECT ON TABLE public."tasks" TO "anon";

GRANT TRIGGER ON TABLE public."tasks" TO "anon";

GRANT TRUNCATE ON TABLE public."tasks" TO "anon";

GRANT UPDATE ON TABLE public."tasks" TO "anon";

GRANT DELETE ON TABLE public."tasks" TO "authenticated";

GRANT INSERT ON TABLE public."tasks" TO "authenticated";

GRANT REFERENCES ON TABLE public."tasks" TO "authenticated";

GRANT SELECT ON TABLE public."tasks" TO "authenticated";

GRANT TRIGGER ON TABLE public."tasks" TO "authenticated";

GRANT TRUNCATE ON TABLE public."tasks" TO "authenticated";

GRANT UPDATE ON TABLE public."tasks" TO "authenticated";

GRANT DELETE ON TABLE public."tasks" TO "service_role";

GRANT INSERT ON TABLE public."tasks" TO "service_role";

GRANT REFERENCES ON TABLE public."tasks" TO "service_role";

GRANT SELECT ON TABLE public."tasks" TO "service_role";

GRANT TRIGGER ON TABLE public."tasks" TO "service_role";

GRANT TRUNCATE ON TABLE public."tasks" TO "service_role";

GRANT UPDATE ON TABLE public."tasks" TO "service_role";

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.accept_invite(p_token text)
 RETURNS TABLE(result_company_id uuid, result_company_name text, result_department_id uuid, result_role text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_invite record;
begin
  select * into v_invite from public.invites where token = p_token and status = ''pending'' and expires_at > now();
  if not found then
    raise exception ''رابط الدعوة غير صالح أو منتهي الصلاحية'';
  end if;

  if lower(v_invite.email) <> lower(coalesce(auth.jwt() ->> ''email'', '''')) then
    raise exception ''هذه الدعوة مرسلة لبريد إلكتروني مختلف عن حسابك الحالي'';
  end if;

  update public.profiles set company_id = v_invite.company_id where id = auth.uid();

  insert into public.department_members (department_id, user_id, role)
  values (v_invite.department_id, auth.uid(), v_invite.role)
  on conflict (department_id, user_id) do update set role = excluded.role;

  update public.invites set status = ''accepted'' where id = v_invite.id;

  return query select c.id, c.name, v_invite.department_id, v_invite.role from public.companies c where c.id = v_invite.company_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.add_internal_request_attachment(p_request_id uuid, p_file_name text, p_file_url text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_attachment_id uuid;
begin
  if not public.can_view_internal_request(p_request_id) then
    raise exception ''لا تملك صلاحية الوصول لهذا الطلب'';
  end if;
  if p_file_name is null or trim(p_file_name) = '''' or p_file_url is null or trim(p_file_url) = '''' then
    raise exception ''لازم اسم ورابط الملف'';
  end if;

  insert into public.internal_request_attachments (request_id, file_name, created_by)
  values (p_request_id, trim(p_file_name), auth.uid())
  returning id into v_attachment_id;

  insert into public.internal_request_attachment_revisions (attachment_id, revision_number, file_url, uploaded_by)
  values (v_attachment_id, 1, p_file_url, auth.uid());

  return v_attachment_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.add_internal_request_attachment_revision(p_attachment_id uuid, p_file_url text, p_note text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_request_id uuid;
  v_next_revision integer;
  v_revision_id uuid;
begin
  select request_id into v_request_id from public.internal_request_attachments where id = p_attachment_id;
  if v_request_id is null then
    raise exception ''المرفق غير موجود'';
  end if;
  if not public.can_view_internal_request(v_request_id) then
    raise exception ''لا تملك صلاحية الوصول لهذا الطلب'';
  end if;
  if p_file_url is null or trim(p_file_url) = '''' then
    raise exception ''لازم رابط الملف'';
  end if;

  select coalesce(max(revision_number), 0) + 1 into v_next_revision
  from public.internal_request_attachment_revisions where attachment_id = p_attachment_id;

  insert into public.internal_request_attachment_revisions (attachment_id, revision_number, file_url, uploaded_by, note)
  values (p_attachment_id, v_next_revision, p_file_url, auth.uid(), p_note)
  returning id into v_revision_id;

  return v_revision_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.audit_budget_actual_entries()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company_id uuid;
  v_project_id uuid;
begin
  select p.id, p.company_id into v_project_id, v_company_id
  from public.activities a join public.projects p on p.id = a.project_id
  where a.id = coalesce(new.activity_id, old.activity_id);
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, v_project_id, ''budget_actual_entries'', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in (''UPDATE'', ''DELETE'') then to_jsonb(old) end,
    case when tg_op in (''INSERT'', ''UPDATE'') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.audit_contract_deductions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company_id uuid;
  v_project_id uuid;
begin
  select p.id, p.company_id into v_project_id, v_company_id
  from public.contracts c join public.projects p on p.id = c.project_id
  where c.id = coalesce(new.contract_id, old.contract_id);
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, v_project_id, ''contract_deductions'', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in (''UPDATE'', ''DELETE'') then to_jsonb(old) end,
    case when tg_op in (''INSERT'', ''UPDATE'') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.audit_contract_extra_works()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company_id uuid;
  v_project_id uuid;
begin
  select p.id, p.company_id into v_project_id, v_company_id
  from public.contracts c join public.projects p on p.id = c.project_id
  where c.id = coalesce(new.contract_id, old.contract_id);
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, v_project_id, ''contract_extra_works'', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in (''UPDATE'', ''DELETE'') then to_jsonb(old) end,
    case when tg_op in (''INSERT'', ''UPDATE'') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.audit_contract_payments()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company_id uuid;
  v_project_id uuid;
begin
  select p.id, p.company_id into v_project_id, v_company_id
  from public.contracts c join public.projects p on p.id = c.project_id
  where c.id = coalesce(new.contract_id, old.contract_id);
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, v_project_id, ''contract_payments'', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in (''UPDATE'', ''DELETE'') then to_jsonb(old) end,
    case when tg_op in (''INSERT'', ''UPDATE'') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.audit_contracts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company_id uuid;
  v_project_id uuid;
begin
  v_project_id := coalesce(new.project_id, old.project_id);
  select p.company_id into v_company_id from public.projects p where p.id = v_project_id;
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, v_project_id, ''contracts'', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in (''UPDATE'', ''DELETE'') then to_jsonb(old) end,
    case when tg_op in (''INSERT'', ''UPDATE'') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.audit_employees()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
begin
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    coalesce(new.company_id, old.company_id), ''employees'', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in (''UPDATE'', ''DELETE'') then to_jsonb(old) end,
    case when tg_op in (''INSERT'', ''UPDATE'') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.audit_internal_approval_chain_steps()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company_id uuid;
begin
  select r.company_id into v_company_id
  from public.internal_approval_chains ac join public.internal_requests r on r.id = ac.internal_request_id
  where ac.id = coalesce(new.chain_id, old.chain_id);
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, ''internal_approval_chain_steps'', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in (''UPDATE'', ''DELETE'') then to_jsonb(old) end,
    case when tg_op in (''INSERT'', ''UPDATE'') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.audit_internal_approval_chains()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company_id uuid;
begin
  select company_id into v_company_id from public.internal_requests where id = coalesce(new.internal_request_id, old.internal_request_id);
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, ''internal_approval_chains'', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in (''UPDATE'', ''DELETE'') then to_jsonb(old) end,
    case when tg_op in (''INSERT'', ''UPDATE'') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.audit_internal_request_attachment_revisions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company_id uuid;
begin
  select r.company_id into v_company_id
  from public.internal_request_attachments a join public.internal_requests r on r.id = a.request_id
  where a.id = coalesce(new.attachment_id, old.attachment_id);
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, ''internal_request_attachment_revisions'', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in (''UPDATE'', ''DELETE'') then to_jsonb(old) end,
    case when tg_op in (''INSERT'', ''UPDATE'') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.audit_internal_request_attachments()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company_id uuid;
begin
  select company_id into v_company_id from public.internal_requests where id = coalesce(new.request_id, old.request_id);
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, ''internal_request_attachments'', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in (''UPDATE'', ''DELETE'') then to_jsonb(old) end,
    case when tg_op in (''INSERT'', ''UPDATE'') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.audit_internal_requests()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
begin
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    coalesce(new.company_id, old.company_id), null, ''internal_requests'', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in (''UPDATE'', ''DELETE'') then to_jsonb(old) end,
    case when tg_op in (''INSERT'', ''UPDATE'') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.audit_material_requests()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company_id uuid;
  v_project_id uuid;
begin
  v_project_id := coalesce(new.project_id, old.project_id);
  select p.company_id into v_company_id from public.projects p where p.id = v_project_id;
  if v_company_id is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, v_project_id, ''material_requests'', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in (''UPDATE'', ''DELETE'') then to_jsonb(old) end,
    case when tg_op in (''INSERT'', ''UPDATE'') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
    and (
      public.is_company_owner(p.company_id)
      or public.is_executive(p.company_id)
      or exists (
        select 1 from public.department_members dm
        where dm.department_id = p.department_id and dm.user_id = auth.uid() and dm.role = ''head''
      )
      or exists (
        select 1 from public.project_members pm
        where pm.project_id = p.id and pm.user_id = auth.uid()
      )
    )
  );
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.can_approve_budget_variance(p_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
  select
    public.can_manage_org((select company_id from public.projects where id = p_project_id))
    or exists (
      select 1
      from public.department_members dm
      join public.departments d on d.id = dm.department_id
      where dm.user_id = auth.uid()
        and d.type = ''finance''
        and d.company_id = (select company_id from public.projects where id = p_project_id)
    );
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.can_executive_approve(p_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
  select public.is_department_head_of_type(p_project_id, ''executive'');
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.can_finance_approve(p_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
  select public.is_department_head_of_type(p_project_id, ''finance'');
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.can_manage_department(p_department_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company_id uuid;
  v_current_id uuid;
begin
  select company_id into v_company_id from public.departments where id = p_department_id;
  if v_company_id is null then
    return false;
  end if;

  if public.can_manage_org(v_company_id) then
    return true;
  end if;

  v_current_id := p_department_id;
  while v_current_id is not null loop
    if exists (
      select 1 from public.department_members dm
      where dm.department_id = v_current_id and dm.user_id = auth.uid() and dm.role = ''head''
    ) then
      return true;
    end if;
    select parent_department_id into v_current_id from public.departments where id = v_current_id;
  end loop;

  return false;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.can_manage_org(p_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
  select public.is_company_owner(p_company_id) or public.is_executive(p_company_id);
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.can_manage_project(p_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
    and (
      public.is_company_owner(p.company_id)
      or public.is_executive(p.company_id)
      or exists (
        select 1 from public.department_members dm
        where dm.department_id = p.department_id and dm.user_id = auth.uid() and dm.role = ''head''
      )
      or exists (
        select 1 from public.project_members pm
        where pm.project_id = p.id and pm.user_id = auth.uid() and pm.role = ''manager''
      )
    )
  );
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.can_pm_approve(p_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
  select public.is_department_head_of_type(p_project_id, ''project_management'');
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.can_view_audit_entry(p_table_name text, p_record_id uuid, p_company_id uuid, p_project_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
begin
  if public.can_manage_org(p_company_id) then
    return true;
  end if;
  if p_project_id is not null and public.can_access_project(p_project_id) then
    return true;
  end if;
  if p_table_name in (''internal_requests'', ''internal_approval_chains'', ''internal_approval_chain_steps'', ''internal_request_attachments'', ''internal_request_attachment_revisions'') then
    return exists (
      select 1 from public.internal_requests ir
      where (
        (p_table_name = ''internal_requests'' and ir.id = p_record_id)
        or (p_table_name = ''internal_approval_chains'' and ir.id = (select internal_request_id from public.internal_approval_chains where id = p_record_id))
        or (p_table_name = ''internal_approval_chain_steps'' and ir.id = (
              select ac.internal_request_id from public.internal_approval_chain_steps s
              join public.internal_approval_chains ac on ac.id = s.chain_id where s.id = p_record_id))
        or (p_table_name = ''internal_request_attachments'' and ir.id = (select request_id from public.internal_request_attachments where id = p_record_id))
        or (p_table_name = ''internal_request_attachment_revisions'' and ir.id = (
              select a.request_id from public.internal_request_attachment_revisions rev
              join public.internal_request_attachments a on a.id = rev.attachment_id where rev.id = p_record_id))
      )
      and public.can_view_internal_request(ir.id)
    );
  end if;
  return false;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.can_view_internal_request(p_request_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
  select
    exists (select 1 from public.internal_requests r where r.id = p_request_id and r.user_id = auth.uid())
    or public.can_manage_org((select company_id from public.internal_requests where id = p_request_id))
    or exists (
      select 1
      from public.internal_approval_chains ac
      join public.internal_approval_chain_steps s on s.chain_id = ac.id
      where ac.internal_request_id = p_request_id
        and (
          s.assigned_user_id = auth.uid()
          or (s.department_id is not null and public.is_department_head(s.department_id))
        )
    );
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.create_approval_chain_template(p_name text, p_chain_type text, p_steps jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company_id uuid;
  v_template_id uuid;
  v_step jsonb;
  v_order integer := 0;
begin
  select company_id into v_company_id from public.profiles where id = auth.uid();
  if v_company_id is null then
    raise exception ''لا تنتمي لأي شركة'';
  end if;
  if p_name is null or trim(p_name) = '''' then
    raise exception ''لازم اسم للقالب'';
  end if;
  if p_steps is null or jsonb_array_length(p_steps) = 0 then
    raise exception ''لازم خطوة اعتماد واحدة على الأقل'';
  end if;

  insert into public.approval_chain_templates (company_id, name, chain_type, created_by)
  values (v_company_id, trim(p_name), coalesce(p_chain_type, ''linear''), auth.uid())
  returning id into v_template_id;

  for v_step in select * from jsonb_array_elements(p_steps) loop
    v_order := v_order + 1;
    insert into public.approval_chain_template_steps (template_id, step_order, department_id, assigned_user_id)
    values (v_template_id, v_order, nullif(v_step->>''department_id'', '''')::uuid, nullif(v_step->>''user_id'', '''')::uuid);
  end loop;

  return v_template_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.create_company(p_name text, p_logo_url text, p_archive_folder_name text, p_archive_storage_type text, p_archive_local_path text)
 RETURNS companies
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company public.companies;
begin
  if auth.uid() is null then
    raise exception ''يلزم تسجيل الدخول'';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and company_id is not null) then
    raise exception ''لديك شركة بالفعل'';
  end if;

  insert into public.companies (name, logo_url, archive_folder_name, archive_storage_type, archive_local_path)
  values (p_name, p_logo_url, p_archive_folder_name, p_archive_storage_type, p_archive_local_path)
  returning * into v_company;

  update public.profiles set company_id = v_company.id where id = auth.uid();

  return v_company;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.create_individual_account(p_full_name text)
 RETURNS companies
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company public.companies;
begin
  if auth.uid() is null then
    raise exception ''يلزم تسجيل الدخول'';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and company_id is not null) then
    raise exception ''لديك حساب بالفعل'';
  end if;

  insert into public.companies (name, is_individual, archive_folder_name, archive_storage_type)
  values (
    ''مساحة '' || coalesce(nullif(trim(p_full_name), ''''), ''شخصية'') || '' الخاصة'',
    true, ''أرشيفي'', ''cloud''
  )
  returning * into v_company;

  update public.profiles set company_id = v_company.id where id = auth.uid();

  return v_company;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.create_internal_request(p_type text, p_title text, p_description text, p_start_date date, p_end_date date, p_chain_type text, p_steps jsonb, p_note text, p_template_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company_id uuid;
  v_request_id uuid;
  v_chain_id uuid;
  v_chain_type text;
  v_steps jsonb;
  v_step jsonb;
  v_order integer := 0;
  v_first_user uuid;
begin
  select company_id into v_company_id from public.profiles where id = auth.uid();
  if v_company_id is null then
    raise exception ''لا تنتمي لأي شركة'';
  end if;
  if p_title is null or trim(p_title) = '''' then
    raise exception ''لازم عنوان للطلب'';
  end if;

  if p_template_id is not null then
    select chain_type into v_chain_type from public.approval_chain_templates
    where id = p_template_id and company_id = v_company_id;
    if v_chain_type is null then
      raise exception ''القالب غير موجود'';
    end if;
    select jsonb_agg(jsonb_build_object(''department_id'', department_id, ''user_id'', assigned_user_id) order by step_order)
    into v_steps
    from public.approval_chain_template_steps where template_id = p_template_id;
  else
    v_chain_type := coalesce(p_chain_type, ''linear'');
    v_steps := p_steps;
  end if;

  if v_chain_type not in (''linear'', ''network'') then
    raise exception ''نوع سلسلة غير صالح'';
  end if;
  if v_steps is null or jsonb_array_length(v_steps) = 0 then
    raise exception ''لازم تحديد جهة اعتماد واحدة على الأقل'';
  end if;

  insert into public.internal_requests (company_id, user_id, type, title, description, start_date, end_date, status)
  values (
    v_company_id, auth.uid(), p_type, trim(p_title), nullif(trim(coalesce(p_description, '''')), ''''),
    p_start_date, p_end_date, ''pending''
  )
  returning id into v_request_id;

  insert into public.internal_approval_chains (internal_request_id, chain_type, created_by, requester_note)
  values (v_request_id, v_chain_type, auth.uid(), p_note)
  returning id into v_chain_id;

  for v_step in select * from jsonb_array_elements(v_steps) loop
    v_order := v_order + 1;
    insert into public.internal_approval_chain_steps (chain_id, step_order, department_id, assigned_user_id)
    values (v_chain_id, v_order, nullif(v_step->>''department_id'', '''')::uuid, nullif(v_step->>''user_id'', '''')::uuid);

    if v_order = 1 then
      v_first_user := nullif(v_step->>''user_id'', '''')::uuid;
    end if;
  end loop;

  if v_first_user is not null then
    perform public.notify_user(
      v_company_id, v_first_user, ''طلب جديد بانتظار اعتمادك'',
      trim(p_title), ''/my-requests''
    );
  end if;

  return v_request_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.current_company_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
  select company_id from public.profiles where id = auth.uid();
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.delete_approval_chain_template(p_template_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company_id uuid;
  v_created_by uuid;
begin
  select company_id, created_by into v_company_id, v_created_by
  from public.approval_chain_templates where id = p_template_id;
  if v_company_id is null then
    raise exception ''القالب غير موجود'';
  end if;
  if v_created_by <> auth.uid() and not public.can_manage_org(v_company_id) then
    raise exception ''لا تملك صلاحية حذف هذا القالب'';
  end if;
  delete from public.approval_chain_templates where id = p_template_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.delete_contract(p_contract_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_project_id uuid;
  v_status text;
begin
  select project_id, status into v_project_id, v_status from public.contracts where id = p_contract_id;

  if v_project_id is null then
    raise exception ''العقد غير موجود'';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception ''لا تملك صلاحية حذف هذا العقد'';
  end if;
  if v_status not in (''draft'', ''rejected'') then
    raise exception ''لا يمكن حذف عقد معتمد أو قيد الاعتماد — فقط العقود بحالة مسودة أو مرفوضة'';
  end if;

  delete from public.contracts where id = p_contract_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.delete_internal_request(p_request_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_user_id uuid;
  v_company_id uuid;
begin
  select user_id, company_id into v_user_id, v_company_id
  from public.internal_requests where id = p_request_id;

  if v_user_id is null then
    raise exception ''الطلب غير موجود'';
  end if;
  if v_user_id <> auth.uid() and not public.can_manage_org(v_company_id) then
    raise exception ''لا تملك صلاحية حذف هذا الطلب'';
  end if;

  delete from public.internal_requests where id = p_request_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.generate_company_code()
 RETURNS text
 LANGUAGE sql
AS $function$
  select upper(substr(encode(gen_random_bytes(8), ''hex''), 1, 10));
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.guard_budget_entry_value_freeze()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
begin
  if current_setting(''app.bypass_workflow_guard'', true) = ''on'' then
    return new;
  end if;
  if old.status <> ''draft'' and (
       new.amount is distinct from old.amount
    or new.date is distinct from old.date
    or new.activity_id is distinct from old.activity_id
    or new.source is distinct from old.source
    or new.contract_ref is distinct from old.contract_ref
    or new.contract_payment_id is distinct from old.contract_payment_id
  ) then
    raise exception ''لا يمكن تعديل تفاصيل الدفعة الفعلية بعد رفعها للاعتماد؛ أعدها للمسودة أولاً'';
  end if;
  return new;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.guard_contract_value_freeze()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
begin
  if current_setting(''app.bypass_workflow_guard'', true) = ''on'' then
    return new;
  end if;
  if old.status <> ''draft'' and (
       new.total_value is distinct from old.total_value
    or new.vat_inclusive is distinct from old.vat_inclusive
    or new.vat_rate is distinct from old.vat_rate
  ) then
    raise exception ''لا يمكن تعديل قيمة العقد بعد رفعها للاعتماد؛ أعد العقد للمسودة أولاً'';
  end if;
  return new;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.guard_extra_work_value_freeze()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
begin
  if current_setting(''app.bypass_workflow_guard'', true) = ''on'' then
    return new;
  end if;
  if old.status <> ''draft'' and new.amount is distinct from old.amount then
    raise exception ''لا يمكن تعديل قيمة البند الإضافي بعد رفعه للاعتماد'';
  end if;
  return new;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.guard_material_value_freeze()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
begin
  if current_setting(''app.bypass_workflow_guard'', true) = ''on'' then
    return new;
  end if;
  if old.status not in (''sample_approved'', ''purchase_rejected'') and new.quote_price is distinct from old.quote_price then
    raise exception ''لا يمكن تعديل سعر عرض الشراء بعد رفعه للاعتماد'';
  end if;
  return new;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.guard_payment_value_freeze()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
begin
  if current_setting(''app.bypass_workflow_guard'', true) = ''on'' then
    return new;
  end if;
  if old.status <> ''pending'' and (
       new.amount is distinct from old.amount
    or new.percentage is distinct from old.percentage
  ) then
    raise exception ''لا يمكن تعديل قيمة الدفعة بعد رفعها للاعتماد'';
  end if;
  return new;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.guard_protected_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  col text;
begin
  if current_setting(''app.bypass_workflow_guard'', true) = ''on'' then
    return new;
  end if;
  foreach col in array tg_argv loop
    if (to_jsonb(new) -> col) is distinct from (to_jsonb(old) -> col) then
      raise exception ''العمود "%" محمي ولا يمكن تعديله إلا عبر إجراء الاعتماد الرسمي'', col;
    end if;
  end loop;
  return new;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.handle_new_company()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  pm_dept_id uuid;
  exec_dept_id uuid;
begin
  insert into public.departments (company_id, name, type) values (new.id, ''إدارة المشاريع'', ''project_management'')
    returning id into pm_dept_id;
  insert into public.departments (company_id, name, type) values (new.id, ''مدير الحساب'', ''executive'')
    returning id into exec_dept_id;

  insert into public.department_members (department_id, user_id, role) values (pm_dept_id, new.created_by, ''head'');
  insert into public.department_members (department_id, user_id, role) values (exec_dept_id, new.created_by, ''head'');

  return new;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.handle_new_project()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
begin
  if new.department_id is null then
    select id into new.department_id
    from public.departments
    where company_id = new.company_id and type = ''project_management''
    limit 1;
  end if;
  return new;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> ''full_name'', ''''));
  return new;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.insert_approval_step(p_step_id uuid, p_department_id uuid, p_user_id uuid, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_assigned_user_id uuid;
  v_step_status text;
  v_chain_status text;
  v_company_id uuid;
begin
  select acs.chain_id, acs.step_order, acs.assigned_user_id, acs.status
  into v_chain_id, v_step_order, v_assigned_user_id, v_step_status
  from public.approval_chain_steps acs where acs.id = p_step_id;

  if v_chain_id is null then
    raise exception ''مرحلة الاعتماد غير موجودة'';
  end if;
  select ac.status, p.company_id into v_chain_status, v_company_id
  from public.approval_chains ac
  join public.material_requests mr on mr.id = ac.material_request_id
  join public.projects p on p.id = mr.project_id
  where ac.id = v_chain_id;

  if v_chain_status <> ''pending'' then
    raise exception ''سلسلة الاعتماد هذه غير نشطة حالياً'';
  end if;
  if v_step_status <> ''pending'' then
    raise exception ''هذه المرحلة ليست بانتظار إجراء'';
  end if;
  if exists (
    select 1 from public.approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> ''approved''
  ) then
    raise exception ''لم يصل الدور لهذه المرحلة بعد'';
  end if;
  if (v_assigned_user_id is null or v_assigned_user_id <> auth.uid()) and not public.can_manage_org(v_company_id) then
    raise exception ''فقط الشخص المطلوب اعتماده بهذه المرحلة يقدر يضيف معتمداً إضافياً قبله'';
  end if;
  if p_department_id is null and p_user_id is null then
    raise exception ''لازم تحديد قسم أو شخص للمعتمد الإضافي'';
  end if;

  update public.approval_chain_steps
  set step_order = step_order + 1
  where chain_id = v_chain_id and step_order >= v_step_order;

  insert into public.approval_chain_steps (chain_id, step_order, department_id, assigned_user_id, inserted_by, note)
  values (v_chain_id, v_step_order, p_department_id, p_user_id, auth.uid(), p_note);
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.insert_internal_approval_step(p_step_id uuid, p_department_id uuid, p_user_id uuid, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_assigned_user_id uuid;
  v_step_status text;
  v_chain_status text;
  v_company_id uuid;
begin
  select acs.chain_id, acs.step_order, acs.assigned_user_id, acs.status
  into v_chain_id, v_step_order, v_assigned_user_id, v_step_status
  from public.internal_approval_chain_steps acs where acs.id = p_step_id;

  if v_chain_id is null then
    raise exception ''مرحلة الاعتماد غير موجودة'';
  end if;
  select ac.status, r.company_id into v_chain_status, v_company_id
  from public.internal_approval_chains ac
  join public.internal_requests r on r.id = ac.internal_request_id
  where ac.id = v_chain_id;

  if v_chain_status <> ''pending'' then
    raise exception ''سلسلة الاعتماد هذه غير نشطة حالياً'';
  end if;
  if v_step_status <> ''pending'' then
    raise exception ''هذه المرحلة ليست بانتظار إجراء'';
  end if;
  if exists (
    select 1 from public.internal_approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> ''approved''
  ) then
    raise exception ''لم يصل الدور لهذه المرحلة بعد'';
  end if;
  if (v_assigned_user_id is null or v_assigned_user_id <> auth.uid()) and not public.can_manage_org(v_company_id) then
    raise exception ''فقط الشخص المطلوب اعتماده بهذه المرحلة يقدر يضيف معتمداً إضافياً قبله'';
  end if;
  if p_department_id is null and p_user_id is null then
    raise exception ''لازم تحديد قسم أو شخص للمعتمد الإضافي'';
  end if;

  update public.internal_approval_chain_steps
  set step_order = step_order + 1
  where chain_id = v_chain_id and step_order >= v_step_order;

  insert into public.internal_approval_chain_steps (chain_id, step_order, department_id, assigned_user_id, inserted_by, note)
  values (v_chain_id, v_step_order, p_department_id, p_user_id, auth.uid(), p_note);
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.is_company_owner(p_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
  select exists (select 1 from public.companies where id = p_company_id and created_by = auth.uid());
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.is_department_head(p_department_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
  select
    public.can_manage_org((select company_id from public.departments where id = p_department_id))
    or exists (
      select 1 from public.department_members dm
      where dm.department_id = p_department_id and dm.user_id = auth.uid() and dm.role = ''head''
    );
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.is_department_head_of_type(p_project_id uuid, p_dept_type text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
  select
    public.can_manage_org((select company_id from public.projects where id = p_project_id))
    or exists (
      select 1
      from public.department_members dm
      join public.departments d on d.id = dm.department_id
      where dm.user_id = auth.uid()
        and dm.role = ''head''
        and d.type = p_dept_type
        and d.company_id = (select company_id from public.projects where id = p_project_id)
    );
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.is_executive(p_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
  select exists (
    select 1 from public.department_members dm
    join public.departments d on d.id = dm.department_id
    where dm.user_id = auth.uid() and d.company_id = p_company_id and d.type = ''executive''
  );
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.is_platform_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.join_company_by_code(p_code text)
 RETURNS TABLE(result_company_id uuid, result_company_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company record;
  v_dept_id uuid;
begin
  select * into v_company from public.companies
  where company_code = upper(trim(p_code));

  if not found then
    raise exception ''رمز الشركة غير صحيح'';
  end if;
  if v_company.company_code_expires_at is null or v_company.company_code_expires_at < now() then
    raise exception ''انتهت صلاحية رمز الانضمام، اطلب من إدارة الشركة رمزاً جديداً'';
  end if;

  update public.profiles set company_id = v_company.id where id = auth.uid();

  select id into v_dept_id
  from public.departments
  where company_id = v_company.id and type = ''project_management''
  limit 1;

  if v_dept_id is not null then
    insert into public.department_members (department_id, user_id, role)
    values (v_dept_id, auth.uid(), ''member'')
    on conflict (department_id, user_id) do nothing;
  end if;

  return query select v_company.id, v_company.name;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.list_all_companies_billing()
 RETURNS TABLE(id uuid, name text, subscription_status text, trial_ends_at timestamp with time zone, subscription_note text, subscription_updated_at timestamp with time zone, created_at timestamp with time zone, member_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
  select c.id, c.name, c.subscription_status, c.trial_ends_at, c.subscription_note,
         c.subscription_updated_at, c.created_at,
         (select count(*) from public.profiles p where p.company_id = c.id) as member_count
  from public.companies c
  where public.is_platform_admin()
  order by c.created_at desc;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.notify_user(p_company_id uuid, p_user_id uuid, p_title text, p_body text, p_link text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
begin
  if p_user_id is null then
    return;
  end if;
  insert into public.notifications (company_id, user_id, title, body, link)
  values (p_company_id, p_user_id, p_title, p_body, p_link);
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.prevent_employee_manager_circular_chain()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_current uuid;
  v_hops int := 0;
begin
  if new.direct_manager_employee_id is null then
    return new;
  end if;

  if new.direct_manager_employee_id = new.id then
    raise exception ''لا يمكن أن يكون الموظف مديره المباشر بنفسه'';
  end if;

  v_current := new.direct_manager_employee_id;
  while v_current is not null and v_hops < 1000 loop
    if v_current = new.id then
      raise exception ''لا يمكن تعيين هذا الشخص كمدير مباشر لأنه يُنشئ حلقة إدارية دائرية'';
    end if;
    select direct_manager_employee_id into v_current from public.employees where id = v_current;
    v_hops := v_hops + 1;
  end loop;

  return new;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.regenerate_company_code(p_company_id uuid)
 RETURNS TABLE(result_company_code text, result_expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_code text;
  v_expires timestamptz;
begin
  if not public.can_manage_org(p_company_id) then
    raise exception ''لا تملك صلاحية تجديد رمز الانضمام'';
  end if;

  v_code := public.generate_company_code();
  v_expires := now() + interval ''30 days'';

  update public.companies
  set company_code = v_code, company_code_expires_at = v_expires
  where id = p_company_id;

  return query select v_code, v_expires;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.reroute_approval_step(p_step_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_department_id uuid;
  v_step_status text;
  v_chain_status text;
begin
  select chain_id, step_order, department_id, status
  into v_chain_id, v_step_order, v_department_id, v_step_status
  from public.approval_chain_steps where id = p_step_id;

  if v_chain_id is null then
    raise exception ''مرحلة الاعتماد غير موجودة'';
  end if;
  select status into v_chain_status from public.approval_chains where id = v_chain_id;
  if v_chain_status <> ''pending'' then
    raise exception ''سلسلة الاعتماد هذه غير نشطة حالياً'';
  end if;
  if v_step_status <> ''pending'' then
    raise exception ''هذه المرحلة ليست بانتظار إجراء'';
  end if;
  if v_department_id is null then
    raise exception ''هذه المرحلة موجّهة لشخص محدد عند إنشاء السلسلة، لا يمكن إعادة توجيهها'';
  end if;
  if exists (
    select 1 from public.approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> ''approved''
  ) then
    raise exception ''لم يصل الدور لهذه المرحلة بعد'';
  end if;
  if not public.is_department_head(v_department_id) then
    raise exception ''لا تملك صلاحية إعادة توجيه طلبات هذا القسم (رئيس القسم فقط)'';
  end if;

  update public.approval_chain_steps
  set assigned_user_id = p_user_id, routed_by = auth.uid(), routed_at = now()
  where id = p_step_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.reroute_internal_approval_step(p_step_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_department_id uuid;
  v_step_status text;
  v_chain_status text;
begin
  select chain_id, step_order, department_id, status
  into v_chain_id, v_step_order, v_department_id, v_step_status
  from public.internal_approval_chain_steps where id = p_step_id;

  if v_chain_id is null then
    raise exception ''مرحلة الاعتماد غير موجودة'';
  end if;
  select status into v_chain_status from public.internal_approval_chains where id = v_chain_id;
  if v_chain_status <> ''pending'' then
    raise exception ''سلسلة الاعتماد هذه غير نشطة حالياً'';
  end if;
  if v_step_status <> ''pending'' then
    raise exception ''هذه المرحلة ليست بانتظار إجراء'';
  end if;
  if v_department_id is null then
    raise exception ''هذه المرحلة موجّهة لشخص محدد عند إنشاء السلسلة، لا يمكن إعادة توجيهها'';
  end if;
  if exists (
    select 1 from public.internal_approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> ''approved''
  ) then
    raise exception ''لم يصل الدور لهذه المرحلة بعد'';
  end if;
  if not public.is_department_head(v_department_id) then
    raise exception ''لا تملك صلاحية إعادة توجيه طلبات هذا القسم (رئيس القسم فقط)'';
  end if;

  update public.internal_approval_chain_steps
  set assigned_user_id = p_user_id, routed_by = auth.uid(), routed_at = now()
  where id = p_step_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.reset_budget_entry_to_draft(p_entry_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_project_id uuid;
  v_status text;
begin
  select a.project_id, e.status into v_project_id, v_status
  from public.budget_actual_entries e
  join public.activities a on a.id = e.activity_id
  where e.id = p_entry_id;

  if v_project_id is null then
    raise exception ''الدفعة غير موجودة'';
  end if;
  if not public.can_pm_approve(v_project_id) then
    raise exception ''لا تملك صلاحية إعادة هذه الدفعة للمسودة'';
  end if;
  if v_status not in (''approved'', ''rejected'', ''pending_pm_approval'', ''pending_finance_approval'') then
    raise exception ''هذه الدفعة بمسودة بالفعل'';
  end if;

  perform set_config(''app.bypass_workflow_guard'', ''on'', true);
  update public.budget_actual_entries
  set status = ''draft'',
      submitted_by = null, submitted_at = null,
      pm_reviewed_by = null, pm_reviewed_at = null, pm_review_note = null,
      finance_reviewed_by = null, finance_reviewed_at = null, finance_review_note = null
  where id = p_entry_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.reset_contract_to_draft(p_contract_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_project_id uuid;
  v_status text;
begin
  select project_id, status into v_project_id, v_status from public.contracts where id = p_contract_id;
  if v_project_id is null then
    raise exception ''العقد غير موجود'';
  end if;
  if not public.can_pm_approve(v_project_id) then
    raise exception ''لا تملك صلاحية إعادة العقد للمسودة'';
  end if;
  if v_status <> ''approved'' then
    raise exception ''لا يمكن إعادة عقد لم يُعتمد بعد إلى المسودة'';
  end if;

  perform set_config(''app.bypass_workflow_guard'', ''on'', true);
  update public.contracts
  set status = ''draft'',
      submitted_by = null, submitted_at = null,
      pm_reviewed_by = null, pm_reviewed_at = null, pm_review_note = null,
      finance_reviewed_by = null, finance_reviewed_at = null, finance_review_note = null
  where id = p_contract_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.review_approval_step(p_step_id uuid, p_approve boolean, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
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
    raise exception ''مرحلة الاعتماد غير موجودة'';
  end if;

  select ac.status, ac.phase, ac.material_request_id, p.company_id
  into v_chain_status, v_phase, v_material_request_id, v_company_id
  from public.approval_chains ac
  join public.material_requests mr on mr.id = ac.material_request_id
  join public.projects p on p.id = mr.project_id
  where ac.id = v_chain_id;

  if v_chain_status <> ''pending'' then
    raise exception ''سلسلة الاعتماد هذه غير نشطة حالياً'';
  end if;
  if v_step_status <> ''pending'' then
    raise exception ''هذه المرحلة ليست بانتظار إجراء'';
  end if;
  if exists (
    select 1 from public.approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> ''approved''
  ) then
    raise exception ''لم يصل الدور لهذه المرحلة بعد'';
  end if;
  if v_assigned_user_id is null then
    raise exception ''يلزم توجيه هذه المرحلة لشخص محدد قبل اعتمادها'';
  end if;
  if v_assigned_user_id <> auth.uid() and not public.can_manage_org(v_company_id) then
    raise exception ''لا تملك صلاحية الاعتماد على هذه المرحلة'';
  end if;
  if not p_approve and (p_note is null or trim(p_note) = '''') then
    raise exception ''لازم توضيح سبب الرفض'';
  end if;

  if p_approve and v_step_department_id is not null then
    select type into v_department_type from public.departments where id = v_step_department_id;
    if v_department_type = ''procurement'' and not exists (
      select 1 from public.material_request_options where material_request_id = v_material_request_id
    ) then
      raise exception ''لازم إرفاق عرض سعر واحد على الأقل قبل اعتماد مرحلة المشتريات'';
    end if;
  end if;

  update public.approval_chain_steps
  set status = case when p_approve then ''approved'' else ''rejected'' end,
      acted_by = auth.uid(), acted_at = now(), note = p_note
  where id = p_step_id;

  perform set_config(''app.bypass_workflow_guard'', ''on'', true);

  if not p_approve then
    update public.approval_chain_steps set status = ''skipped'' where chain_id = v_chain_id and status = ''pending'';
    update public.approval_chains set status = ''rejected'', decided_at = now() where id = v_chain_id;
    update public.material_requests
    set status = case when v_phase = ''sample'' then ''sample_rejected'' else ''purchase_rejected'' end
    where id = v_material_request_id;
  else
    select max(step_order) into v_max_order from public.approval_chain_steps where chain_id = v_chain_id;
    if v_step_order = v_max_order then
      update public.approval_chains set status = ''approved'', decided_at = now() where id = v_chain_id;
      update public.material_requests
      set status = case when v_phase = ''sample'' then ''sample_approved'' else ''purchase_approved'' end
      where id = v_material_request_id;
    end if;
  end if;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.review_budget_entry(p_entry_id uuid, p_approve boolean, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_project_id uuid;
  v_status text;
begin
  select a.project_id, e.status into v_project_id, v_status
  from public.budget_actual_entries e
  join public.activities a on a.id = e.activity_id
  where e.id = p_entry_id;

  if v_project_id is null then
    raise exception ''الدفعة غير موجودة'';
  end if;

  perform set_config(''app.bypass_workflow_guard'', ''on'', true);

  if v_status = ''pending_pm_approval'' then
    if not public.can_pm_approve(v_project_id) then
      raise exception ''لا تملك صلاحية اعتماد الدفعات الفعلية بهذه المرحلة (رئيس قسم إدارة المشاريع)'';
    end if;
    update public.budget_actual_entries
    set status = case when p_approve then ''pending_finance_approval'' else ''rejected'' end,
        pm_reviewed_by = auth.uid(), pm_reviewed_at = now(), pm_review_note = p_note
    where id = p_entry_id;
  elsif v_status = ''pending_finance_approval'' then
    if not public.can_finance_approve(v_project_id) then
      raise exception ''لا تملك صلاحية الاعتماد المالي النهائي'';
    end if;
    update public.budget_actual_entries
    set status = case when p_approve then ''approved'' else ''rejected'' end,
        finance_reviewed_by = auth.uid(), finance_reviewed_at = now(), finance_review_note = p_note
    where id = p_entry_id;
  else
    raise exception ''هذه الدفعة ليست بانتظار اعتماد حالياً'';
  end if;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.review_contract(p_contract_id uuid, p_approve boolean, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_project_id uuid;
  v_status text;
begin
  select project_id, status into v_project_id, v_status from public.contracts where id = p_contract_id;
  if v_project_id is null then
    raise exception ''العقد غير موجود'';
  end if;

  perform set_config(''app.bypass_workflow_guard'', ''on'', true);

  if v_status = ''pending_pm_approval'' then
    if not public.can_pm_approve(v_project_id) then
      raise exception ''لا تملك صلاحية اعتماد العقود بهذه المرحلة (رئيس قسم إدارة المشاريع)'';
    end if;
    update public.contracts
    set status = case when p_approve then ''pending_finance_approval'' else ''rejected'' end,
        pm_reviewed_by = auth.uid(), pm_reviewed_at = now(), pm_review_note = p_note
    where id = p_contract_id;
  elsif v_status = ''pending_finance_approval'' then
    if not public.can_finance_approve(v_project_id) then
      raise exception ''لا تملك صلاحية الاعتماد المالي النهائي'';
    end if;
    update public.contracts
    set status = case when p_approve then ''approved'' else ''rejected'' end,
        finance_reviewed_by = auth.uid(), finance_reviewed_at = now(), finance_review_note = p_note
    where id = p_contract_id;
  else
    raise exception ''هذا العقد ليس بانتظار اعتماد حالياً'';
  end if;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.review_contract_extra_work(p_extra_work_id uuid, p_approve boolean, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_project_id uuid;
  v_status text;
begin
  select p.id, ew.status into v_project_id, v_status
  from public.contract_extra_works ew
  join public.contracts c on c.id = ew.contract_id
  join public.projects p on p.id = c.project_id
  where ew.id = p_extra_work_id;

  if v_project_id is null then
    raise exception ''البند غير موجود'';
  end if;

  perform set_config(''app.bypass_workflow_guard'', ''on'', true);

  if v_status = ''pending_pm_approval'' then
    if not public.can_pm_approve(v_project_id) then
      raise exception ''لا تملك صلاحية اعتماد الأعمال الإضافية بهذه المرحلة (رئيس قسم إدارة المشاريع)'';
    end if;
    update public.contract_extra_works
    set status = case when p_approve then ''pending_finance_approval'' else ''rejected'' end,
        pm_reviewed_by = auth.uid(), pm_reviewed_at = now(), pm_review_note = p_note
    where id = p_extra_work_id;
  elsif v_status = ''pending_finance_approval'' then
    if not public.can_finance_approve(v_project_id) then
      raise exception ''لا تملك صلاحية الاعتماد المالي النهائي'';
    end if;
    update public.contract_extra_works
    set status = case when p_approve then ''approved'' else ''rejected'' end,
        finance_reviewed_by = auth.uid(), finance_reviewed_at = now(), finance_review_note = p_note
    where id = p_extra_work_id;
  else
    raise exception ''هذا البند ليس بانتظار اعتماد حالياً'';
  end if;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.review_contract_payment(p_payment_id uuid, p_approve boolean, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_project_id uuid;
  v_status text;
begin
  select p.project_id, cp.status into v_project_id, v_status
  from public.contract_payments cp
  join public.contracts c on c.id = cp.contract_id
  join public.projects p on p.id = c.project_id
  where cp.id = p_payment_id;

  if v_project_id is null then
    raise exception ''الدفعة غير موجودة'';
  end if;

  perform set_config(''app.bypass_workflow_guard'', ''on'', true);

  if v_status = ''pending_pm_approval'' then
    if not public.can_pm_approve(v_project_id) then
      raise exception ''لا تملك صلاحية اعتماد الدفعات بهذه المرحلة (رئيس قسم إدارة المشاريع)'';
    end if;
    update public.contract_payments
    set status = case when p_approve then ''pending_finance_approval'' else ''rejected'' end,
        pm_reviewed_by = auth.uid(), pm_reviewed_at = now(), pm_review_note = p_note
    where id = p_payment_id;
  elsif v_status = ''pending_finance_approval'' then
    if not public.can_finance_approve(v_project_id) then
      raise exception ''لا تملك صلاحية الاعتماد المالي النهائي'';
    end if;
    update public.contract_payments
    set status = case when p_approve then ''approved'' else ''rejected'' end,
        finance_reviewed_by = auth.uid(), finance_reviewed_at = now(), finance_review_note = p_note
    where id = p_payment_id;
  else
    raise exception ''هذه الدفعة ليست بانتظار اعتماد حالياً'';
  end if;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.review_contract_settlement(p_contract_id uuid, p_approve boolean, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_project_id uuid;
  v_settlement_status text;
begin
  select project_id, settlement_status into v_project_id, v_settlement_status
  from public.contracts where id = p_contract_id;

  if v_project_id is null then
    raise exception ''العقد غير موجود'';
  end if;

  perform set_config(''app.bypass_workflow_guard'', ''on'', true);

  if v_settlement_status = ''pending_pm_approval'' then
    if not public.can_pm_approve(v_project_id) then
      raise exception ''لا تملك صلاحية اعتماد التصفية بهذه المرحلة (رئيس قسم إدارة المشاريع)'';
    end if;
    update public.contracts
    set settlement_status = case when p_approve then ''pending_finance_approval'' else ''rejected'' end,
        settlement_pm_reviewed_by = auth.uid(), settlement_pm_reviewed_at = now(), settlement_pm_review_note = p_note
    where id = p_contract_id;
  elsif v_settlement_status = ''pending_finance_approval'' then
    if not public.can_finance_approve(v_project_id) then
      raise exception ''لا تملك صلاحية الاعتماد المالي النهائي للتصفية'';
    end if;
    update public.contracts
    set settlement_status = case when p_approve then ''settled'' else ''rejected'' end,
        settlement_finance_reviewed_by = auth.uid(), settlement_finance_reviewed_at = now(), settlement_finance_review_note = p_note,
        settled_at = case when p_approve then now() else null end
    where id = p_contract_id;
  else
    raise exception ''هذا العقد ليس بانتظار اعتماد تصفية حالياً'';
  end if;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.review_internal_approval_step(p_step_id uuid, p_approve boolean, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_assigned_user_id uuid;
  v_step_status text;
  v_chain_status text;
  v_request_id uuid;
  v_company_id uuid;
  v_title text;
  v_owner_id uuid;
  v_max_order integer;
  v_next_step_id uuid;
  v_next_assigned uuid;
begin
  select acs.chain_id, acs.step_order, acs.assigned_user_id, acs.status
  into v_chain_id, v_step_order, v_assigned_user_id, v_step_status
  from public.internal_approval_chain_steps acs where acs.id = p_step_id;

  if v_chain_id is null then
    raise exception ''مرحلة الاعتماد غير موجودة'';
  end if;

  select ac.status, ac.internal_request_id, r.company_id, r.title, r.user_id
  into v_chain_status, v_request_id, v_company_id, v_title, v_owner_id
  from public.internal_approval_chains ac
  join public.internal_requests r on r.id = ac.internal_request_id
  where ac.id = v_chain_id;

  if v_chain_status <> ''pending'' then
    raise exception ''سلسلة الاعتماد هذه غير نشطة حالياً'';
  end if;
  if v_step_status <> ''pending'' then
    raise exception ''هذه المرحلة ليست بانتظار إجراء'';
  end if;
  if exists (
    select 1 from public.internal_approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> ''approved''
  ) then
    raise exception ''لم يصل الدور لهذه المرحلة بعد'';
  end if;
  if v_assigned_user_id is null then
    raise exception ''يلزم توجيه هذه المرحلة لشخص محدد قبل اعتمادها'';
  end if;
  if v_assigned_user_id <> auth.uid() and not public.can_manage_org(v_company_id) then
    raise exception ''لا تملك صلاحية الاعتماد على هذه المرحلة'';
  end if;
  if not p_approve and (p_note is null or trim(p_note) = '''') then
    raise exception ''لازم توضيح سبب الرفض'';
  end if;

  update public.internal_approval_chain_steps
  set status = case when p_approve then ''approved'' else ''rejected'' end,
      acted_by = auth.uid(), acted_at = now(), note = p_note
  where id = p_step_id;

  if not p_approve then
    update public.internal_approval_chain_steps set status = ''skipped'' where chain_id = v_chain_id and status = ''pending'';
    update public.internal_approval_chains set status = ''rejected'', decided_at = now() where id = v_chain_id;
    update public.internal_requests set status = ''rejected'' where id = v_request_id;
    perform public.notify_user(v_company_id, v_owner_id, ''رُفض طلبك'', v_title, ''/my-requests'');
  else
    select max(step_order) into v_max_order from public.internal_approval_chain_steps where chain_id = v_chain_id;
    if v_step_order = v_max_order then
      update public.internal_approval_chains set status = ''approved'', decided_at = now() where id = v_chain_id;
      update public.internal_requests set status = ''approved'' where id = v_request_id;
      perform public.notify_user(v_company_id, v_owner_id, ''تم اعتماد طلبك'', v_title, ''/my-requests'');
    else
      select id, assigned_user_id into v_next_step_id, v_next_assigned
      from public.internal_approval_chain_steps
      where chain_id = v_chain_id and step_order > v_step_order
      order by step_order limit 1;
      if v_next_assigned is not null then
        perform public.notify_user(v_company_id, v_next_assigned, ''طلب بانتظار اعتمادك'', v_title, ''/my-requests'');
      end if;
    end if;
  end if;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.route_approval_step(p_step_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_department_id uuid;
  v_assigned_user_id uuid;
  v_step_status text;
  v_chain_status text;
begin
  select chain_id, step_order, department_id, assigned_user_id, status
  into v_chain_id, v_step_order, v_department_id, v_assigned_user_id, v_step_status
  from public.approval_chain_steps where id = p_step_id;

  if v_chain_id is null then
    raise exception ''مرحلة الاعتماد غير موجودة'';
  end if;
  select status into v_chain_status from public.approval_chains where id = v_chain_id;
  if v_chain_status <> ''pending'' then
    raise exception ''سلسلة الاعتماد هذه غير نشطة حالياً'';
  end if;
  if v_step_status <> ''pending'' then
    raise exception ''هذه المرحلة ليست بانتظار إجراء'';
  end if;
  if v_department_id is null then
    raise exception ''هذه المرحلة موجّهة لشخص محدد مسبقاً، لا تحتاج تحويل'';
  end if;
  if v_assigned_user_id is not null then
    raise exception ''هذه المرحلة محوّلة مسبقاً'';
  end if;
  if exists (
    select 1 from public.approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> ''approved''
  ) then
    raise exception ''لم يصل الدور لهذه المرحلة بعد'';
  end if;
  if not public.is_department_head(v_department_id) then
    raise exception ''لا تملك صلاحية توجيه طلبات هذا القسم (رئيس القسم فقط)'';
  end if;

  update public.approval_chain_steps
  set assigned_user_id = p_user_id, routed_by = auth.uid(), routed_at = now()
  where id = p_step_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.route_internal_approval_step(p_step_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_department_id uuid;
  v_assigned_user_id uuid;
  v_step_status text;
  v_chain_status text;
  v_company_id uuid;
  v_title text;
begin
  select chain_id, step_order, department_id, assigned_user_id, status
  into v_chain_id, v_step_order, v_department_id, v_assigned_user_id, v_step_status
  from public.internal_approval_chain_steps where id = p_step_id;

  if v_chain_id is null then
    raise exception ''مرحلة الاعتماد غير موجودة'';
  end if;
  select ac.status, r.company_id, r.title into v_chain_status, v_company_id, v_title
  from public.internal_approval_chains ac
  join public.internal_requests r on r.id = ac.internal_request_id
  where ac.id = v_chain_id;

  if v_chain_status <> ''pending'' then
    raise exception ''سلسلة الاعتماد هذه غير نشطة حالياً'';
  end if;
  if v_step_status <> ''pending'' then
    raise exception ''هذه المرحلة ليست بانتظار إجراء'';
  end if;
  if v_department_id is null then
    raise exception ''هذه المرحلة موجّهة لشخص محدد مسبقاً، لا تحتاج تحويل'';
  end if;
  if v_assigned_user_id is not null then
    raise exception ''هذه المرحلة محوّلة مسبقاً'';
  end if;
  if exists (
    select 1 from public.internal_approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> ''approved''
  ) then
    raise exception ''لم يصل الدور لهذه المرحلة بعد'';
  end if;
  if not public.is_department_head(v_department_id) then
    raise exception ''لا تملك صلاحية توجيه طلبات هذا القسم (رئيس القسم فقط)'';
  end if;

  update public.internal_approval_chain_steps
  set assigned_user_id = p_user_id, routed_by = auth.uid(), routed_at = now()
  where id = p_step_id;

  perform public.notify_user(v_company_id, p_user_id, ''طلب موجَّه إليك للاعتماد'', v_title, ''/my-requests'');
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.send_back_approval_step(p_step_id uuid, p_target_step_id uuid, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
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
    raise exception ''مرحلة الاعتماد غير موجودة'';
  end if;

  select ac.status, ac.chain_type, p.company_id
  into v_chain_status, v_chain_type, v_company_id
  from public.approval_chains ac
  join public.material_requests mr on mr.id = ac.material_request_id
  join public.projects p on p.id = mr.project_id
  where ac.id = v_chain_id;

  if v_chain_type <> ''network'' then
    raise exception ''الإرجاع لمرحلة سابقة متاح فقط للسلاسل الشبكية'';
  end if;
  if v_chain_status <> ''pending'' then
    raise exception ''سلسلة الاعتماد هذه غير نشطة حالياً'';
  end if;
  if v_step_status <> ''pending'' then
    raise exception ''هذه المرحلة ليست بانتظار إجراء'';
  end if;
  if exists (
    select 1 from public.approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> ''approved''
  ) then
    raise exception ''لم يصل الدور لهذه المرحلة بعد'';
  end if;
  if v_assigned_user_id is null then
    raise exception ''يلزم توجيه هذه المرحلة لشخص محدد قبل التصرف بها'';
  end if;
  if v_assigned_user_id <> auth.uid() and not public.can_manage_org(v_company_id) then
    raise exception ''لا تملك صلاحية إرجاع هذه المرحلة'';
  end if;
  if p_note is null or trim(p_note) = '''' then
    raise exception ''لازم توضيح سبب الإرجاع'';
  end if;

  select chain_id, step_order into v_target_chain_id, v_target_order
  from public.approval_chain_steps where id = p_target_step_id;

  if v_target_chain_id is distinct from v_chain_id then
    raise exception ''المرحلة المستهدفة ليست ضمن نفس السلسلة'';
  end if;
  if v_target_order >= v_step_order then
    raise exception ''الإرجاع يكون فقط لمرحلة سابقة'';
  end if;

  update public.approval_chain_steps
  set status = ''pending'', acted_by = null, acted_at = null,
      note = case when id = p_target_step_id then p_note else null end
  where chain_id = v_chain_id and step_order between v_target_order and v_step_order;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.send_back_internal_approval_step(p_step_id uuid, p_target_step_id uuid, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_assigned_user_id uuid;
  v_step_status text;
  v_chain_status text;
  v_chain_type text;
  v_company_id uuid;
  v_title text;
  v_target_chain_id uuid;
  v_target_order integer;
  v_target_assigned uuid;
begin
  select acs.chain_id, acs.step_order, acs.assigned_user_id, acs.status
  into v_chain_id, v_step_order, v_assigned_user_id, v_step_status
  from public.internal_approval_chain_steps acs where acs.id = p_step_id;

  if v_chain_id is null then
    raise exception ''مرحلة الاعتماد غير موجودة'';
  end if;

  select ac.status, ac.chain_type, r.company_id, r.title
  into v_chain_status, v_chain_type, v_company_id, v_title
  from public.internal_approval_chains ac
  join public.internal_requests r on r.id = ac.internal_request_id
  where ac.id = v_chain_id;

  if v_chain_type <> ''network'' then
    raise exception ''الإرجاع لمرحلة سابقة متاح فقط للسلاسل الشبكية'';
  end if;
  if v_chain_status <> ''pending'' then
    raise exception ''سلسلة الاعتماد هذه غير نشطة حالياً'';
  end if;
  if v_step_status <> ''pending'' then
    raise exception ''هذه المرحلة ليست بانتظار إجراء'';
  end if;
  if exists (
    select 1 from public.internal_approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> ''approved''
  ) then
    raise exception ''لم يصل الدور لهذه المرحلة بعد'';
  end if;
  if v_assigned_user_id is null then
    raise exception ''يلزم توجيه هذه المرحلة لشخص محدد قبل التصرف بها'';
  end if;
  if v_assigned_user_id <> auth.uid() and not public.can_manage_org(v_company_id) then
    raise exception ''لا تملك صلاحية إرجاع هذه المرحلة'';
  end if;
  if p_note is null or trim(p_note) = '''' then
    raise exception ''لازم توضيح سبب الإرجاع'';
  end if;

  select chain_id, step_order, assigned_user_id into v_target_chain_id, v_target_order, v_target_assigned
  from public.internal_approval_chain_steps where id = p_target_step_id;

  if v_target_chain_id is distinct from v_chain_id then
    raise exception ''المرحلة المستهدفة ليست ضمن نفس السلسلة'';
  end if;
  if v_target_order >= v_step_order then
    raise exception ''الإرجاع يكون فقط لمرحلة سابقة'';
  end if;

  update public.internal_approval_chain_steps
  set status = ''pending'', acted_by = null, acted_at = null,
      note = case when id = p_target_step_id then p_note else null end
  where chain_id = v_chain_id and step_order between v_target_order and v_step_order;

  if v_target_assigned is not null then
    perform public.notify_user(v_company_id, v_target_assigned, ''أُعيد إليك طلب لاستكمال/توضيح'', v_title, ''/my-requests'');
  end if;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.set_company_subscription(p_company_id uuid, p_status text, p_trial_ends_at timestamp with time zone, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
begin
  if not public.is_platform_admin() then
    raise exception ''هذا الإجراء محصور بإدارة المنصة'';
  end if;
  if p_status not in (''trial'', ''active'', ''expired'', ''canceled'') then
    raise exception ''حالة اشتراك غير صحيحة'';
  end if;

  update public.companies
  set subscription_status = p_status,
      trial_ends_at = coalesce(p_trial_ends_at, trial_ends_at),
      subscription_note = p_note,
      subscription_updated_by = auth.uid(),
      subscription_updated_at = now()
  where id = p_company_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.set_project_departments(p_project_id uuid, p_department_id uuid, p_procurement_department_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company_id uuid;
begin
  select company_id into v_company_id from public.projects where id = p_project_id;
  if v_company_id is null then
    raise exception ''المشروع غير موجود'';
  end if;
  if not public.can_manage_org(v_company_id) then
    raise exception ''لا تملك صلاحية تعديل أقسام هذا المشروع — مالك الحساب أو الإدارة التنفيذية فقط'';
  end if;
  if p_department_id is not null and not exists (
    select 1 from public.departments where id = p_department_id and company_id = v_company_id
  ) then
    raise exception ''قسم إدارة المشروع المحدد غير تابع لهذه الشركة'';
  end if;
  if p_procurement_department_id is not null and not exists (
    select 1 from public.departments where id = p_procurement_department_id and company_id = v_company_id
  ) then
    raise exception ''قسم المشتريات المحدد غير تابع لهذه الشركة'';
  end if;

  update public.projects
  set department_id = p_department_id, procurement_department_id = p_procurement_department_id
  where id = p_project_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.submit_budget_entry(p_entry_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_project_id uuid;
  v_status text;
  v_amount numeric;
begin
  select a.project_id, e.status, e.amount into v_project_id, v_status, v_amount
  from public.budget_actual_entries e
  join public.activities a on a.id = e.activity_id
  where e.id = p_entry_id;

  if v_project_id is null then
    raise exception ''الدفعة غير موجودة'';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception ''لا تملك صلاحية الوصول لهذا المشروع'';
  end if;
  if v_status <> ''draft'' then
    raise exception ''هذه الدفعة ليست في مرحلة مسودة'';
  end if;
  if v_amount is null or v_amount <= 0 then
    raise exception ''لازم مبلغ صحيح للدفعة أولاً'';
  end if;

  perform set_config(''app.bypass_workflow_guard'', ''on'', true);
  update public.budget_actual_entries
  set status = ''pending_pm_approval'', submitted_by = auth.uid(), submitted_at = now()
  where id = p_entry_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.submit_contract(p_contract_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_project_id uuid;
  v_status text;
  v_total_value numeric;
begin
  select project_id, status, total_value into v_project_id, v_status, v_total_value
  from public.contracts where id = p_contract_id;

  if v_project_id is null then
    raise exception ''العقد غير موجود'';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception ''لا تملك صلاحية الوصول لهذا المشروع'';
  end if;
  if v_status <> ''draft'' then
    raise exception ''هذا العقد ليس في مرحلة مسودة'';
  end if;
  if v_total_value is null or v_total_value <= 0 then
    raise exception ''لازم إدخال قيمة صحيحة للعقد أولاً'';
  end if;

  perform set_config(''app.bypass_workflow_guard'', ''on'', true);
  update public.contracts
  set status = ''pending_pm_approval'', submitted_by = auth.uid(), submitted_at = now()
  where id = p_contract_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.submit_contract_extra_work(p_extra_work_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_project_id uuid;
  v_status text;
  v_amount numeric;
begin
  select p.id, ew.status, ew.amount into v_project_id, v_status, v_amount
  from public.contract_extra_works ew
  join public.contracts c on c.id = ew.contract_id
  join public.projects p on p.id = c.project_id
  where ew.id = p_extra_work_id;

  if v_project_id is null then
    raise exception ''البند غير موجود'';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception ''لا تملك صلاحية الوصول لهذا المشروع'';
  end if;
  if v_status not in (''draft'', ''rejected'') then
    raise exception ''هذا البند ليس في مرحلة تسمح بالتقديم للاعتماد'';
  end if;
  if v_amount is null or v_amount <= 0 then
    raise exception ''لازم إدخال قيمة صحيحة للبند أولاً'';
  end if;

  perform set_config(''app.bypass_workflow_guard'', ''on'', true);
  update public.contract_extra_works
  set status = ''pending_pm_approval'',
      submitted_by = auth.uid(), submitted_at = now(),
      pm_reviewed_by = null, pm_reviewed_at = null, pm_review_note = null,
      finance_reviewed_by = null, finance_reviewed_at = null, finance_review_note = null
  where id = p_extra_work_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.submit_contract_payment(p_payment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_project_id uuid;
  v_status text;
begin
  select p.project_id, cp.status into v_project_id, v_status
  from public.contract_payments cp
  join public.contracts c on c.id = cp.contract_id
  join public.projects p on p.id = c.project_id
  where cp.id = p_payment_id;

  if v_project_id is null then
    raise exception ''الدفعة غير موجودة'';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception ''لا تملك صلاحية الوصول لهذا المشروع'';
  end if;
  if v_status <> ''pending'' then
    raise exception ''هذه الدفعة ليست في مرحلة قابلة للتقديم'';
  end if;

  perform set_config(''app.bypass_workflow_guard'', ''on'', true);
  update public.contract_payments
  set status = ''pending_pm_approval'', submitted_by = auth.uid(), submitted_at = now()
  where id = p_payment_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.submit_contract_settlement(p_contract_id uuid, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_project_id uuid;
  v_status text;
  v_settlement_status text;
begin
  select project_id, status, settlement_status into v_project_id, v_status, v_settlement_status
  from public.contracts where id = p_contract_id;

  if v_project_id is null then
    raise exception ''العقد غير موجود'';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception ''لا تملك صلاحية الوصول لهذا المشروع'';
  end if;
  if v_status <> ''approved'' then
    raise exception ''لا يمكن بدء التصفية النهائية إلا لعقد معتمد'';
  end if;
  if v_settlement_status not in (''open'', ''rejected'') then
    raise exception ''إجراء التصفية النهائية بدأ بالفعل لهذا العقد'';
  end if;

  perform set_config(''app.bypass_workflow_guard'', ''on'', true);
  update public.contracts
  set settlement_status = ''pending_pm_approval'',
      settlement_note = p_note,
      settlement_submitted_by = auth.uid(), settlement_submitted_at = now(),
      settlement_pm_reviewed_by = null, settlement_pm_reviewed_at = null, settlement_pm_review_note = null,
      settlement_finance_reviewed_by = null, settlement_finance_reviewed_at = null, settlement_finance_review_note = null
  where id = p_contract_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.submit_material_purchase_chain(p_request_id uuid, p_steps jsonb, p_note text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
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
    raise exception ''طلب المادة غير موجود'';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception ''لا تملك صلاحية الوصول لهذا المشروع'';
  end if;
  if v_status not in (''sample_approved'', ''purchase_rejected'') then
    raise exception ''يلزم اعتماد العينة أولاً قبل تقديم طلب الشراء الرسمي'';
  end if;
  if v_quote_price is null then
    raise exception ''لازم إدخال سعر عرض السعر أولاً'';
  end if;
  if p_steps is null or jsonb_array_length(p_steps) = 0 then
    raise exception ''لازم تحديد جهة اعتماد واحدة على الأقل'';
  end if;

  insert into public.approval_chains (material_request_id, phase, created_by, requester_note)
  values (p_request_id, ''purchase'', auth.uid(), p_note)
  returning id into v_chain_id;

  for v_step in select * from jsonb_array_elements(p_steps) loop
    v_order := v_order + 1;
    insert into public.approval_chain_steps (chain_id, step_order, department_id, assigned_user_id)
    values (v_chain_id, v_order, nullif(v_step->>''department_id'', '''')::uuid, nullif(v_step->>''user_id'', '''')::uuid);
  end loop;

  perform set_config(''app.bypass_workflow_guard'', ''on'', true);
  update public.material_requests set status = ''purchase_pending'' where id = p_request_id;

  return v_chain_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.submit_material_sourcing(p_request_id uuid, p_note text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
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
    raise exception ''طلب المادة غير موجود'';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception ''لا تملك صلاحية الوصول لهذا المشروع'';
  end if;
  if v_status not in (''draft'', ''sample_rejected'') then
    raise exception ''هذا الطلب ليس في مرحلة تسمح بإرساله للمشتريات'';
  end if;

  select procurement_department_id, department_id into v_procurement_dept, v_pm_dept
  from public.projects where id = v_project_id;

  if v_procurement_dept is null then
    raise exception ''لم يُحدَّد قسم المشتريات المسؤول عن هذا المشروع بعد — يحدده مدير الحساب من شاشة "فريق المشروع"'';
  end if;
  if v_pm_dept is null then
    raise exception ''لم يُحدَّد قسم إدارة المشروع المسؤول عن هذا المشروع بعد — يحدده مدير الحساب من شاشة "فريق المشروع"'';
  end if;

  insert into public.approval_chains (material_request_id, phase, chain_type, created_by, requester_note)
  values (p_request_id, ''sample'', ''network'', auth.uid(), p_note)
  returning id into v_chain_id;

  insert into public.approval_chain_steps (chain_id, step_order, department_id, assigned_user_id) values
    (v_chain_id, 1, v_procurement_dept, null),
    (v_chain_id, 2, null, v_created_by),
    (v_chain_id, 3, v_pm_dept, null);

  perform set_config(''app.bypass_workflow_guard'', ''on'', true);
  update public.material_requests set status = ''sample_pending'' where id = p_request_id;

  return v_chain_id;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.sync_employee_from_department_member()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company_id uuid;
  v_employee_id uuid;
  v_full_name text;
  v_email text;
begin
  select company_id into v_company_id from public.departments where id = new.department_id;
  select full_name into v_full_name from public.profiles where id = new.user_id;
  select email into v_email from auth.users where id = new.user_id;

  select id into v_employee_id from public.employees where user_id = new.user_id and company_id = v_company_id;

  if v_employee_id is null and v_email is not null then
    select id into v_employee_id from public.employees
    where company_id = v_company_id and user_id is null and lower(email) = lower(v_email)
    limit 1;
    if v_employee_id is not null then
      update public.employees set user_id = new.user_id, status = ''active'' where id = v_employee_id;
    end if;
  end if;

  if v_employee_id is null then
    insert into public.employees (company_id, department_id, full_name, email, user_id, status)
    values (v_company_id, new.department_id, coalesce(v_full_name, ''بدون اسم''), v_email, new.user_id, ''active'')
    returning id into v_employee_id;
  end if;

  new.employee_id := v_employee_id;
  return new;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.touch_employee_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.validate_activity_contract_link()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
begin
  if new.linked_contract_id is not null then
    if not exists (
      select 1 from public.contracts c
      where c.id = new.linked_contract_id and c.project_id = new.project_id
    ) then
      raise exception ''linked_contract_id must belong to the same project'';
    end if;
  end if;
  return new;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.validate_department_member_taxonomy()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_company_id uuid;
begin
  select company_id into v_company_id from public.departments where id = new.department_id;

  if new.organizational_level_id is not null and not exists (
    select 1 from public.organizational_levels where id = new.organizational_level_id and company_id = v_company_id
  ) then
    raise exception ''المستوى الإداري المختار لا يتبع لنفس الشركة'';
  end if;

  if new.organizational_classification_id is not null and not exists (
    select 1 from public.organizational_classifications where id = new.organizational_classification_id and company_id = v_company_id
  ) then
    raise exception ''التصنيف المختار لا يتبع لنفس الشركة'';
  end if;

  if new.job_title_id is not null and not exists (
    select 1 from public.job_titles where id = new.job_title_id and company_id = v_company_id
  ) then
    raise exception ''المسمّى الوظيفي المختار لا يتبع لنفس الشركة'';
  end if;

  if new.employee_id is not null and not exists (
    select 1 from public.employees where id = new.employee_id and company_id = v_company_id
  ) then
    raise exception ''سجل الموظف المرتبط لا يتبع لنفس الشركة'';
  end if;

  return new;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

DO $acl$ DECLARE signature text; BEGIN
SELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END='CREATE OR REPLACE FUNCTION public.validate_employee_references()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
begin
  if new.department_id is not null and not exists (
    select 1 from public.departments where id = new.department_id and company_id = new.company_id
  ) then
    raise exception ''القسم المختار لا يتبع لنفس شركة الموظف'';
  end if;

  if new.organizational_level_id is not null and not exists (
    select 1 from public.organizational_levels where id = new.organizational_level_id and company_id = new.company_id
  ) then
    raise exception ''المستوى الإداري المختار لا يتبع لنفس شركة الموظف'';
  end if;

  if new.organizational_classification_id is not null and not exists (
    select 1 from public.organizational_classifications where id = new.organizational_classification_id and company_id = new.company_id
  ) then
    raise exception ''التصنيف المختار لا يتبع لنفس شركة الموظف'';
  end if;

  if new.job_title_id is not null and not exists (
    select 1 from public.job_titles where id = new.job_title_id and company_id = new.company_id
  ) then
    raise exception ''المسمّى الوظيفي المختار لا يتبع لنفس شركة الموظف'';
  end if;

  if new.direct_manager_employee_id is not null and not exists (
    select 1 from public.employees where id = new.direct_manager_employee_id and company_id = new.company_id
  ) then
    raise exception ''المدير المباشر المختار لا يتبع لنفس شركة الموظف'';
  end if;

  return new;
end;
$function$
';
EXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO PUBLIC';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "anon"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "authenticated"';
EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO "service_role"';
END $acl$;

CREATE POLICY "scoped access activities" ON "public"."activities" AS PERMISSIVE FOR ALL TO PUBLIC USING (can_access_project(project_id)) WITH CHECK (can_access_project(project_id));

CREATE POLICY "scoped read approval_chain_steps" ON "public"."approval_chain_steps" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((chain_id IN ( SELECT ac.id
   FROM (approval_chains ac
     JOIN material_requests mr ON ((mr.id = ac.material_request_id)))
  WHERE can_access_project(mr.project_id))));

CREATE POLICY "company members read chain template steps" ON "public"."approval_chain_template_steps" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((template_id IN ( SELECT approval_chain_templates.id
   FROM approval_chain_templates
  WHERE (approval_chain_templates.company_id = ( SELECT profiles.company_id
           FROM profiles
          WHERE (profiles.id = auth.uid()))))));

CREATE POLICY "company members read chain templates" ON "public"."approval_chain_templates" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((company_id = ( SELECT profiles.company_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));

CREATE POLICY "scoped read approval_chains" ON "public"."approval_chains" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((material_request_id IN ( SELECT mr.id
   FROM material_requests mr
  WHERE can_access_project(mr.project_id))));

CREATE POLICY "authorized users read audit_log" ON "public"."audit_log" AS PERMISSIVE FOR SELECT TO PUBLIC USING (can_view_audit_entry(table_name, record_id, company_id, project_id));

CREATE POLICY "delete draft budget_actual_entries" ON "public"."budget_actual_entries" AS PERMISSIVE FOR DELETE TO PUBLIC USING (((status = 'draft'::text) AND (activity_id IN ( SELECT a.id
   FROM activities a
  WHERE can_access_project(a.project_id)))));

CREATE POLICY "insert budget_actual_entries" ON "public"."budget_actual_entries" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((activity_id IN ( SELECT a.id
   FROM activities a
  WHERE can_access_project(a.project_id))));

CREATE POLICY "select budget_actual_entries" ON "public"."budget_actual_entries" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((activity_id IN ( SELECT a.id
   FROM activities a
  WHERE can_access_project(a.project_id))));

CREATE POLICY "update budget_actual_entries" ON "public"."budget_actual_entries" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((activity_id IN ( SELECT a.id
   FROM activities a
  WHERE can_access_project(a.project_id)))) WITH CHECK ((activity_id IN ( SELECT a.id
   FROM activities a
  WHERE can_access_project(a.project_id))));

CREATE POLICY "approvers update notes" ON "public"."budget_reconciliation_notes" AS PERMISSIVE FOR UPDATE TO PUBLIC USING (can_approve_budget_variance(project_id));

CREATE POLICY "project members insert notes" ON "public"."budget_reconciliation_notes" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (can_access_project(project_id));

CREATE POLICY "project members read notes" ON "public"."budget_reconciliation_notes" AS PERMISSIVE FOR SELECT TO PUBLIC USING (can_access_project(project_id));

CREATE POLICY "scoped access checklist_items" ON "public"."checklist_items" AS PERMISSIVE FOR ALL TO PUBLIC USING ((activity_id IN ( SELECT a.id
   FROM activities a
  WHERE can_access_project(a.project_id)))) WITH CHECK ((activity_id IN ( SELECT a.id
   FROM activities a
  WHERE can_access_project(a.project_id))));

CREATE POLICY "scoped access checklist_results" ON "public"."checklist_results" AS PERMISSIVE FOR ALL TO PUBLIC USING ((submission_id IN ( SELECT s.id
   FROM (submissions s
     JOIN activities a ON ((a.id = s.activity_id)))
  WHERE can_access_project(a.project_id)))) WITH CHECK ((submission_id IN ( SELECT s.id
   FROM (submissions s
     JOIN activities a ON ((a.id = s.activity_id)))
  WHERE can_access_project(a.project_id))));

CREATE POLICY "insert company when authenticated" ON "public"."companies" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "org managers update company" ON "public"."companies" AS PERMISSIVE FOR UPDATE TO PUBLIC USING (can_manage_org(id));

CREATE POLICY "platform admins read all companies" ON "public"."companies" AS PERMISSIVE FOR SELECT TO PUBLIC USING (is_platform_admin());

CREATE POLICY "read own company" ON "public"."companies" AS PERMISSIVE FOR SELECT TO PUBLIC USING (((id = current_company_id()) OR (created_by = auth.uid())));

CREATE POLICY "company members read holidays" ON "public"."company_holidays" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((company_id = current_company_id()));

CREATE POLICY "org managers delete holidays" ON "public"."company_holidays" AS PERMISSIVE FOR DELETE TO PUBLIC USING (can_manage_org(company_id));

CREATE POLICY "org managers insert holidays" ON "public"."company_holidays" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (can_manage_org(company_id));

CREATE POLICY "org managers update holidays" ON "public"."company_holidays" AS PERMISSIVE FOR UPDATE TO PUBLIC USING (can_manage_org(company_id));

CREATE POLICY "scoped access contract_deductions" ON "public"."contract_deductions" AS PERMISSIVE FOR ALL TO PUBLIC USING ((contract_id IN ( SELECT c.id
   FROM contracts c
  WHERE can_access_project(c.project_id)))) WITH CHECK ((contract_id IN ( SELECT c.id
   FROM contracts c
  WHERE can_access_project(c.project_id))));

CREATE POLICY "scoped access contract_extra_works" ON "public"."contract_extra_works" AS PERMISSIVE FOR ALL TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM contracts c
  WHERE ((c.id = contract_extra_works.contract_id) AND can_access_project(c.project_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM contracts c
  WHERE ((c.id = contract_extra_works.contract_id) AND can_access_project(c.project_id)))));

CREATE POLICY "scoped access contract_line_items" ON "public"."contract_line_items" AS PERMISSIVE FOR ALL TO PUBLIC USING ((contract_id IN ( SELECT c.id
   FROM contracts c
  WHERE can_access_project(c.project_id)))) WITH CHECK ((contract_id IN ( SELECT c.id
   FROM contracts c
  WHERE can_access_project(c.project_id))));

CREATE POLICY "scoped access contract_payments" ON "public"."contract_payments" AS PERMISSIVE FOR ALL TO PUBLIC USING ((contract_id IN ( SELECT c.id
   FROM contracts c
  WHERE can_access_project(c.project_id)))) WITH CHECK ((contract_id IN ( SELECT c.id
   FROM contracts c
  WHERE can_access_project(c.project_id))));

CREATE POLICY "scoped access contracts" ON "public"."contracts" AS PERMISSIVE FOR ALL TO PUBLIC USING (can_access_project(project_id)) WITH CHECK (can_access_project(project_id));

CREATE POLICY "company members manage custom_calendars" ON "public"."custom_calendars" AS PERMISSIVE FOR ALL TO PUBLIC USING ((company_id = current_company_id())) WITH CHECK ((company_id = current_company_id()));

CREATE POLICY "company members read custom_calendars" ON "public"."custom_calendars" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((company_id = current_company_id()));

CREATE POLICY "company members read department_members" ON "public"."department_members" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((department_id IN ( SELECT departments.id
   FROM departments
  WHERE (departments.company_id = current_company_id()))));

CREATE POLICY "department managers manage department_members" ON "public"."department_members" AS PERMISSIVE FOR ALL TO PUBLIC USING (can_manage_department(department_id)) WITH CHECK (can_manage_department(department_id));

CREATE POLICY "company members read departments" ON "public"."departments" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((company_id = current_company_id()));

CREATE POLICY "org managers delete departments" ON "public"."departments" AS PERMISSIVE FOR DELETE TO PUBLIC USING (can_manage_org(company_id));

CREATE POLICY "org managers insert departments" ON "public"."departments" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (can_manage_org(company_id));

CREATE POLICY "org managers update departments" ON "public"."departments" AS PERMISSIVE FOR UPDATE TO PUBLIC USING (can_manage_org(company_id));

CREATE POLICY "scoped access document_folders" ON "public"."document_folders" AS PERMISSIVE FOR ALL TO PUBLIC USING (can_access_project(project_id)) WITH CHECK (can_access_project(project_id));

CREATE POLICY "scoped access documents" ON "public"."documents" AS PERMISSIVE FOR ALL TO PUBLIC USING ((folder_id IN ( SELECT f.id
   FROM document_folders f
  WHERE can_access_project(f.project_id)))) WITH CHECK ((folder_id IN ( SELECT f.id
   FROM document_folders f
  WHERE can_access_project(f.project_id))));

CREATE POLICY "company members read employees" ON "public"."employees" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((company_id = current_company_id()));

CREATE POLICY "org managers delete employees" ON "public"."employees" AS PERMISSIVE FOR DELETE TO PUBLIC USING (can_manage_org(company_id));

CREATE POLICY "org managers insert employees" ON "public"."employees" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (can_manage_org(company_id));

CREATE POLICY "org managers update employees" ON "public"."employees" AS PERMISSIVE FOR UPDATE TO PUBLIC USING (can_manage_org(company_id));

CREATE POLICY "scoped read internal_approval_chain_steps" ON "public"."internal_approval_chain_steps" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((chain_id IN ( SELECT internal_approval_chains.id
   FROM internal_approval_chains
  WHERE can_view_internal_request(internal_approval_chains.internal_request_id))));

CREATE POLICY "scoped read internal_approval_chains" ON "public"."internal_approval_chains" AS PERMISSIVE FOR SELECT TO PUBLIC USING (can_view_internal_request(internal_request_id));

CREATE POLICY "scoped read internal_request_attachment_revisions" ON "public"."internal_request_attachment_revisions" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((attachment_id IN ( SELECT internal_request_attachments.id
   FROM internal_request_attachments
  WHERE can_view_internal_request(internal_request_attachments.request_id))));

CREATE POLICY "scoped read internal_request_attachments" ON "public"."internal_request_attachments" AS PERMISSIVE FOR SELECT TO PUBLIC USING (can_view_internal_request(request_id));

CREATE POLICY "scoped read internal_requests" ON "public"."internal_requests" AS PERMISSIVE FOR SELECT TO PUBLIC USING (can_view_internal_request(id));

CREATE POLICY "company members read invites" ON "public"."invites" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((company_id = current_company_id()));

CREATE POLICY "department managers delete invites" ON "public"."invites" AS PERMISSIVE FOR DELETE TO PUBLIC USING (can_manage_department(department_id));

CREATE POLICY "department managers insert invites" ON "public"."invites" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (can_manage_department(department_id));

CREATE POLICY "department managers update invites" ON "public"."invites" AS PERMISSIVE FOR UPDATE TO PUBLIC USING (can_manage_department(department_id));

CREATE POLICY "company members read job_titles" ON "public"."job_titles" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((company_id = current_company_id()));

CREATE POLICY "org managers delete job_titles" ON "public"."job_titles" AS PERMISSIVE FOR DELETE TO PUBLIC USING (can_manage_org(company_id));

CREATE POLICY "org managers insert job_titles" ON "public"."job_titles" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (can_manage_org(company_id));

CREATE POLICY "org managers update job_titles" ON "public"."job_titles" AS PERMISSIVE FOR UPDATE TO PUBLIC USING (can_manage_org(company_id));

CREATE POLICY "scoped access material_request_attachments" ON "public"."material_request_attachments" AS PERMISSIVE FOR ALL TO PUBLIC USING ((material_request_id IN ( SELECT mr.id
   FROM material_requests mr
  WHERE can_access_project(mr.project_id)))) WITH CHECK ((material_request_id IN ( SELECT mr.id
   FROM material_requests mr
  WHERE can_access_project(mr.project_id))));

CREATE POLICY "scoped access material_request_options" ON "public"."material_request_options" AS PERMISSIVE FOR ALL TO PUBLIC USING ((material_request_id IN ( SELECT mr.id
   FROM material_requests mr
  WHERE can_access_project(mr.project_id)))) WITH CHECK ((material_request_id IN ( SELECT mr.id
   FROM material_requests mr
  WHERE can_access_project(mr.project_id))));

CREATE POLICY "scoped access material_requests" ON "public"."material_requests" AS PERMISSIVE FOR ALL TO PUBLIC USING (can_access_project(project_id)) WITH CHECK (can_access_project(project_id));

CREATE POLICY "users mark own notifications read" ON "public"."notifications" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "users read own notifications" ON "public"."notifications" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((user_id = auth.uid()));

CREATE POLICY "company members read organizational_classifications" ON "public"."organizational_classifications" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((company_id = current_company_id()));

CREATE POLICY "org managers delete organizational_classifications" ON "public"."organizational_classifications" AS PERMISSIVE FOR DELETE TO PUBLIC USING (can_manage_org(company_id));

CREATE POLICY "org managers insert organizational_classifications" ON "public"."organizational_classifications" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (can_manage_org(company_id));

CREATE POLICY "org managers update organizational_classifications" ON "public"."organizational_classifications" AS PERMISSIVE FOR UPDATE TO PUBLIC USING (can_manage_org(company_id));

CREATE POLICY "company members read organizational_levels" ON "public"."organizational_levels" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((company_id = current_company_id()));

CREATE POLICY "org managers delete organizational_levels" ON "public"."organizational_levels" AS PERMISSIVE FOR DELETE TO PUBLIC USING (can_manage_org(company_id));

CREATE POLICY "org managers insert organizational_levels" ON "public"."organizational_levels" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (can_manage_org(company_id));

CREATE POLICY "org managers update organizational_levels" ON "public"."organizational_levels" AS PERMISSIVE FOR UPDATE TO PUBLIC USING (can_manage_org(company_id));

CREATE POLICY "platform admins read platform_admins" ON "public"."platform_admins" AS PERMISSIVE FOR SELECT TO PUBLIC USING (is_platform_admin());

CREATE POLICY "company members read teammate profiles" ON "public"."profiles" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((company_id = current_company_id()));

CREATE POLICY "read own profile" ON "public"."profiles" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((id = auth.uid()));

CREATE POLICY "update own profile" ON "public"."profiles" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((id = auth.uid()));

CREATE POLICY "project accessors read project_members" ON "public"."project_members" AS PERMISSIVE FOR SELECT TO PUBLIC USING (can_access_project(project_id));

CREATE POLICY "project managers write project_members" ON "public"."project_members" AS PERMISSIVE FOR ALL TO PUBLIC USING (can_manage_project(project_id)) WITH CHECK (can_manage_project(project_id));

CREATE POLICY "scoped access projects" ON "public"."projects" AS PERMISSIVE FOR ALL TO PUBLIC USING ((is_company_owner(company_id) OR is_executive(company_id) OR (EXISTS ( SELECT 1
   FROM department_members dm
  WHERE ((dm.department_id = projects.department_id) AND (dm.user_id = auth.uid()) AND (dm.role = 'head'::text)))) OR (EXISTS ( SELECT 1
   FROM project_members pm
  WHERE ((pm.project_id = projects.id) AND (pm.user_id = auth.uid())))))) WITH CHECK (((company_id = current_company_id()) AND (is_company_owner(company_id) OR is_executive(company_id) OR (EXISTS ( SELECT 1
   FROM department_members dm
  WHERE ((dm.department_id = projects.department_id) AND (dm.user_id = auth.uid()) AND (dm.role = 'head'::text)))) OR (EXISTS ( SELECT 1
   FROM project_members pm
  WHERE ((pm.project_id = projects.id) AND (pm.user_id = auth.uid())))))));

CREATE POLICY "scoped access submission_images" ON "public"."submission_images" AS PERMISSIVE FOR ALL TO PUBLIC USING ((submission_id IN ( SELECT s.id
   FROM (submissions s
     JOIN activities a ON ((a.id = s.activity_id)))
  WHERE can_access_project(a.project_id)))) WITH CHECK ((submission_id IN ( SELECT s.id
   FROM (submissions s
     JOIN activities a ON ((a.id = s.activity_id)))
  WHERE can_access_project(a.project_id))));

CREATE POLICY "scoped access submissions" ON "public"."submissions" AS PERMISSIVE FOR ALL TO PUBLIC USING ((activity_id IN ( SELECT a.id
   FROM activities a
  WHERE can_access_project(a.project_id)))) WITH CHECK ((activity_id IN ( SELECT a.id
   FROM activities a
  WHERE can_access_project(a.project_id))));

CREATE POLICY "scoped access tasks" ON "public"."tasks" AS PERMISSIVE FOR ALL TO PUBLIC USING (can_access_project(project_id)) WITH CHECK (can_access_project(project_id));

CREATE POLICY "authenticated delete own storage" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO PUBLIC USING (((bucket_id = ANY (ARRAY['company-logos'::text, 'signatures'::text, 'checklist-photos'::text, 'documents'::text])) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "authenticated read storage" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO PUBLIC USING (((bucket_id = ANY (ARRAY['company-logos'::text, 'signatures'::text, 'checklist-photos'::text, 'documents'::text])) AND (auth.uid() IS NOT NULL) AND ((storage.foldername(name))[1] IN ( SELECT (profiles.id)::text AS id
   FROM profiles
  WHERE (profiles.company_id = current_company_id())))));

CREATE POLICY "authenticated update own storage" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO PUBLIC USING (((bucket_id = ANY (ARRAY['company-logos'::text, 'signatures'::text, 'checklist-photos'::text, 'documents'::text])) AND ((storage.foldername(name))[1] = (auth.uid())::text))) WITH CHECK (((bucket_id = ANY (ARRAY['company-logos'::text, 'signatures'::text, 'checklist-photos'::text, 'documents'::text])) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "authenticated upload storage" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (((bucket_id = ANY (ARRAY['company-logos'::text, 'signatures'::text, 'checklist-photos'::text, 'documents'::text])) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_company_created AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION handle_new_company();

CREATE TRIGGER on_project_created BEFORE INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION handle_new_project();

CREATE TRIGGER contracts_audit AFTER INSERT OR DELETE OR UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION audit_contracts();

CREATE TRIGGER contract_payments_audit AFTER INSERT OR DELETE OR UPDATE ON public.contract_payments FOR EACH ROW EXECUTE FUNCTION audit_contract_payments();

CREATE TRIGGER contract_extra_works_audit AFTER INSERT OR DELETE OR UPDATE ON public.contract_extra_works FOR EACH ROW EXECUTE FUNCTION audit_contract_extra_works();

CREATE TRIGGER contract_deductions_audit AFTER INSERT OR DELETE OR UPDATE ON public.contract_deductions FOR EACH ROW EXECUTE FUNCTION audit_contract_deductions();

CREATE TRIGGER material_requests_audit AFTER INSERT OR DELETE OR UPDATE ON public.material_requests FOR EACH ROW EXECUTE FUNCTION audit_material_requests();

CREATE TRIGGER budget_actual_entries_audit AFTER INSERT OR DELETE OR UPDATE ON public.budget_actual_entries FOR EACH ROW EXECUTE FUNCTION audit_budget_actual_entries();

CREATE TRIGGER guard_contracts_workflow BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION guard_protected_columns('status', 'submitted_by', 'submitted_at', 'pm_reviewed_by', 'pm_reviewed_at', 'pm_review_note', 'finance_reviewed_by', 'finance_reviewed_at', 'finance_review_note', 'settlement_status', 'settlement_note', 'settlement_submitted_by', 'settlement_submitted_at', 'settlement_pm_reviewed_by', 'settlement_pm_reviewed_at', 'settlement_pm_review_note', 'settlement_finance_reviewed_by', 'settlement_finance_reviewed_at', 'settlement_finance_review_note', 'settled_at');

CREATE TRIGGER guard_contracts_value BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION guard_contract_value_freeze();

CREATE TRIGGER guard_contract_payments_workflow BEFORE UPDATE ON public.contract_payments FOR EACH ROW EXECUTE FUNCTION guard_protected_columns('status', 'submitted_by', 'submitted_at', 'pm_reviewed_by', 'pm_reviewed_at', 'pm_review_note', 'finance_reviewed_by', 'finance_reviewed_at', 'finance_review_note');

CREATE TRIGGER guard_contract_payments_value BEFORE UPDATE ON public.contract_payments FOR EACH ROW EXECUTE FUNCTION guard_payment_value_freeze();

CREATE TRIGGER guard_contract_extra_works_workflow BEFORE UPDATE ON public.contract_extra_works FOR EACH ROW EXECUTE FUNCTION guard_protected_columns('status', 'submitted_by', 'submitted_at', 'pm_reviewed_by', 'pm_reviewed_at', 'pm_review_note', 'finance_reviewed_by', 'finance_reviewed_at', 'finance_review_note');

CREATE TRIGGER guard_contract_extra_works_value BEFORE UPDATE ON public.contract_extra_works FOR EACH ROW EXECUTE FUNCTION guard_extra_work_value_freeze();

CREATE TRIGGER guard_material_requests_value BEFORE UPDATE ON public.material_requests FOR EACH ROW EXECUTE FUNCTION guard_material_value_freeze();

CREATE TRIGGER guard_material_requests_workflow BEFORE UPDATE ON public.material_requests FOR EACH ROW EXECUTE FUNCTION guard_protected_columns('status');

CREATE TRIGGER internal_approval_chains_audit AFTER INSERT OR DELETE OR UPDATE ON public.internal_approval_chains FOR EACH ROW EXECUTE FUNCTION audit_internal_approval_chains();

CREATE TRIGGER internal_approval_chain_steps_audit AFTER INSERT OR DELETE OR UPDATE ON public.internal_approval_chain_steps FOR EACH ROW EXECUTE FUNCTION audit_internal_approval_chain_steps();

CREATE TRIGGER internal_request_attachments_audit AFTER INSERT OR DELETE OR UPDATE ON public.internal_request_attachments FOR EACH ROW EXECUTE FUNCTION audit_internal_request_attachments();

CREATE TRIGGER internal_request_attachment_revisions_audit AFTER INSERT OR DELETE OR UPDATE ON public.internal_request_attachment_revisions FOR EACH ROW EXECUTE FUNCTION audit_internal_request_attachment_revisions();

CREATE TRIGGER internal_requests_audit AFTER INSERT OR DELETE OR UPDATE ON public.internal_requests FOR EACH ROW EXECUTE FUNCTION audit_internal_requests();

CREATE TRIGGER employees_validate_references BEFORE INSERT OR UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION validate_employee_references();

CREATE TRIGGER employees_prevent_manager_circular_chain BEFORE INSERT OR UPDATE OF direct_manager_employee_id ON public.employees FOR EACH ROW EXECUTE FUNCTION prevent_employee_manager_circular_chain();

CREATE TRIGGER employees_audit AFTER INSERT OR DELETE OR UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION audit_employees();

CREATE TRIGGER employees_touch_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION touch_employee_updated_at();

CREATE TRIGGER department_members_sync_employee BEFORE INSERT ON public.department_members FOR EACH ROW EXECUTE FUNCTION sync_employee_from_department_member();

CREATE TRIGGER department_members_validate_taxonomy BEFORE INSERT OR UPDATE OF organizational_level_id, organizational_classification_id, job_title_id, employee_id, department_id ON public.department_members FOR EACH ROW EXECUTE FUNCTION validate_department_member_taxonomy();

CREATE TRIGGER validate_activity_contract_link BEFORE INSERT OR UPDATE OF linked_contract_id, project_id ON public.activities FOR EACH ROW EXECUTE FUNCTION validate_activity_contract_link();

CREATE TRIGGER guard_budget_entries_workflow BEFORE UPDATE ON public.budget_actual_entries FOR EACH ROW EXECUTE FUNCTION guard_protected_columns('status', 'submitted_by', 'submitted_at', 'pm_reviewed_by', 'pm_reviewed_at', 'pm_review_note', 'finance_reviewed_by', 'finance_reviewed_at', 'finance_review_note');

CREATE TRIGGER guard_budget_entries_value BEFORE UPDATE ON public.budget_actual_entries FOR EACH ROW EXECUTE FUNCTION guard_budget_entry_value_freeze();

-- Fresh environments need bucket records in addition to the Storage schema.
INSERT INTO storage.buckets(id,name,public) VALUES
  ('company-logos','company-logos',false),('signatures','signatures',false),
  ('checklist-photos','checklist-photos',false),('documents','documents',false)
ON CONFLICT (id) DO NOTHING;

COMMIT;
