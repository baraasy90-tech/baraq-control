-- إصلاح خلل بحذف الشركة كاملة (Cascade): عند حذف شركة، تُحذف مشاريعها وعقودها
-- بنفس المعاملة (transaction) في آنٍ واحد — فإن حُذف صف "المشروع" قبل صف "العقد"
-- التابع له، فحين يعمل trigger تدقيق العقد لن يجد المشروع لاستخراج company_id منه
-- (لأنه محذوف بالفعل)، فيحاول إدراج صف بسجل تدقيق بقيمة company_id فارغة، وهذا
-- يخالف قيد NOT NULL على الجدول ويوقف عملية الحذف بالكامل بخطأ.
--
-- الحل: كل دوال تدقيق العقود/المواد/الميزانية تتجاهل التسجيل بصمت (بدل فشل الحذف)
-- لو تعذّر تحديد company_id — منطقي لأن سجل تدقيق لبيانات شركة كاملة قيد الحذف
-- ذاتها لا فائدة حقيقية منه أصلاً.

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
$$;
