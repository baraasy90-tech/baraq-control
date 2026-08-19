-- سجل تدقيق عام: من غيّر أي قيمة مالية حسّاسة، متى، ومن ماذا إلى ماذا — لمدير
-- الحساب/الإدارة التنفيذية فقط. يعمل عبر triggers تلقائية على الجداول المالية
-- الأساسية (لا يحتاج أي تعديل بواجهة الاستخدام لتفعيله لكل عملية إضافة/تعديل/حذف).

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  actor_id uuid references public.profiles (id) on delete set null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_company_id_idx on public.audit_log (company_id, created_at desc);

alter table public.audit_log enable row level security;

create policy "org managers read audit_log" on public.audit_log
  for select using (public.can_manage_org(company_id));

-- ===== contracts =====
create or replace function public.audit_contracts()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select p.company_id into v_company_id from public.projects p where p.id = coalesce(new.project_id, old.project_id);
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, 'contracts', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger contracts_audit after insert or update or delete on public.contracts
  for each row execute function public.audit_contracts();

-- ===== contract_payments =====
create or replace function public.audit_contract_payments()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select p.company_id into v_company_id
  from public.contracts c join public.projects p on p.id = c.project_id
  where c.id = coalesce(new.contract_id, old.contract_id);
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, 'contract_payments', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger contract_payments_audit after insert or update or delete on public.contract_payments
  for each row execute function public.audit_contract_payments();

-- ===== contract_extra_works =====
create or replace function public.audit_contract_extra_works()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select p.company_id into v_company_id
  from public.contracts c join public.projects p on p.id = c.project_id
  where c.id = coalesce(new.contract_id, old.contract_id);
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, 'contract_extra_works', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger contract_extra_works_audit after insert or update or delete on public.contract_extra_works
  for each row execute function public.audit_contract_extra_works();

-- ===== contract_deductions =====
create or replace function public.audit_contract_deductions()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select p.company_id into v_company_id
  from public.contracts c join public.projects p on p.id = c.project_id
  where c.id = coalesce(new.contract_id, old.contract_id);
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, 'contract_deductions', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger contract_deductions_audit after insert or update or delete on public.contract_deductions
  for each row execute function public.audit_contract_deductions();

-- ===== material_requests =====
create or replace function public.audit_material_requests()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select p.company_id into v_company_id from public.projects p where p.id = coalesce(new.project_id, old.project_id);
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, 'material_requests', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger material_requests_audit after insert or update or delete on public.material_requests
  for each row execute function public.audit_material_requests();

-- ===== budget_actual_entries =====
create or replace function public.audit_budget_actual_entries()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select p.company_id into v_company_id
  from public.activities a join public.projects p on p.id = a.project_id
  where a.id = coalesce(new.activity_id, old.activity_id);
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    v_company_id, 'budget_actual_entries', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger budget_actual_entries_audit after insert or update or delete on public.budget_actual_entries
  for each row execute function public.audit_budget_actual_entries();
