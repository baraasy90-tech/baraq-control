-- سجل التدقيق كان مفيداً لكن معزولاً بشاشة واحدة صعبة المتابعة (كل الشركة بقائمة
-- واحدة طويلة)، ومقصوراً على مالك الحساب/التنفيذيين فقط بالقراءة. المطلوب: سجل
-- مصغّر يظهر داخل كل عقد/طلب اعتماد بذاته عند فتحه — "أين ذهب، وماذا تغيّر" — مرئي
-- لكل من يملك صلاحية الوصول لذلك السجل تحديداً (فريق المشروع، وليس فقط الإدارة
-- العليا)، وليس مقصوراً على العقود بل يشمل طلبات المواد والطلبات الداخلية أيضاً.
--
-- التغييرات:
-- 1) عمود project_id على audit_log (يُملأ تلقائياً من نفس الـ triggers الحالية).
-- 2) دالة عامة can_view_audit_entry تحدد من يقدر يرى صف سجل معيّن: مالك/تنفيذي
--    الشركة (كالسابق)، أو أي عضو بنفس مشروع السجل، أو (لطلبات internal_requests
--    التي لا ترتبط بمشروع) صاحب الطلب أو من يملك صلاحية مراجعته.
-- 3) سياسة SELECT جديدة تحل محل القديمة المقصورة على الإدارة العليا فقط.
-- 4) trigger تدقيق جديد على internal_requests (لم يكن مُفعَّلاً سابقاً).

alter table public.audit_log add column project_id uuid references public.projects (id) on delete cascade;
create index audit_log_record_idx on public.audit_log (table_name, record_id, created_at desc);

create or replace function public.can_view_audit_entry(
  p_table_name text, p_record_id uuid, p_company_id uuid, p_project_id uuid
)
returns boolean
language plpgsql
security definer set search_path = public
stable
as $$
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
$$;

drop policy if exists "org managers read audit_log" on public.audit_log;
create policy "authorized users read audit_log" on public.audit_log
  for select using (public.can_view_audit_entry(table_name, record_id, company_id, project_id));

-- ===== إعادة تعريف triggers التدقيق الحالية لتعبئة project_id =====

create or replace function public.audit_contracts()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
  v_project_id uuid;
begin
  v_project_id := coalesce(new.project_id, old.project_id);
  select p.company_id into v_company_id from public.projects p where p.id = v_project_id;
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, v_project_id, 'contracts', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.audit_contract_payments()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
  v_project_id uuid;
begin
  select p.id, p.company_id into v_project_id, v_company_id
  from public.contracts c join public.projects p on p.id = c.project_id
  where c.id = coalesce(new.contract_id, old.contract_id);
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, v_project_id, 'contract_payments', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.audit_contract_extra_works()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
  v_project_id uuid;
begin
  select p.id, p.company_id into v_project_id, v_company_id
  from public.contracts c join public.projects p on p.id = c.project_id
  where c.id = coalesce(new.contract_id, old.contract_id);
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, v_project_id, 'contract_extra_works', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.audit_contract_deductions()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
  v_project_id uuid;
begin
  select p.id, p.company_id into v_project_id, v_company_id
  from public.contracts c join public.projects p on p.id = c.project_id
  where c.id = coalesce(new.contract_id, old.contract_id);
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, v_project_id, 'contract_deductions', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.audit_material_requests()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
  v_project_id uuid;
begin
  v_project_id := coalesce(new.project_id, old.project_id);
  select p.company_id into v_company_id from public.projects p where p.id = v_project_id;
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, v_project_id, 'material_requests', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.audit_budget_actual_entries()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
  v_project_id uuid;
begin
  select p.id, p.company_id into v_project_id, v_company_id
  from public.activities a join public.projects p on p.id = a.project_id
  where a.id = coalesce(new.activity_id, old.activity_id);
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, v_project_id, 'budget_actual_entries', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

-- ===== internal_requests (جديد — لم يكن مُدقَّقاً سابقاً) =====
create or replace function public.audit_internal_requests()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.audit_log (company_id, project_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    coalesce(new.company_id, old.company_id), null, 'internal_requests', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists internal_requests_audit on public.internal_requests;
create trigger internal_requests_audit after insert or update or delete on public.internal_requests
  for each row execute function public.audit_internal_requests();
