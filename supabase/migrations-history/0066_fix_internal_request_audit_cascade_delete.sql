-- نفس خلل 0061 بالضبط لكن على أشقّاء "طلباتي": عند حذف internal_requests يُلغي cascade
-- كل صف internal_approval_chains/internal_approval_chain_steps/internal_request_attachments/
-- internal_request_attachment_revisions التابع له بنفس المعاملة (transaction) — فإن حاول أي
-- من triggers التدقيق الأربعة أدناه استخراج company_id بالانضمام (join) إلى internal_requests
-- بعد أن صار صفها غير مرئي (أو محذوفاً بالفعل)، تعذّر إيجاد company_id فيحاول إدراج سجل
-- تدقيق بقيمة فارغة، فيخالف قيد NOT NULL ويوقف الحذف بالكامل بخطأ. الحل مطابق تماماً لـ 0061:
-- تجاهل التسجيل بصمت بدل فشل الحذف لو تعذّر تحديد company_id.
-- (دالة audit_internal_requests نفسها لا تحتاج إصلاحاً لأنها تقرأ company_id مباشرة من
-- عمود الصف نفسه بلا أي join، فلا يتأثر بترتيب الـ cascade.)

create or replace function public.audit_internal_approval_chains()
returns trigger
language plpgsql
security definer set search_path = public
as $$
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
$$;

create or replace function public.audit_internal_approval_chain_steps()
returns trigger
language plpgsql
security definer set search_path = public
as $$
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
$$;

create or replace function public.audit_internal_request_attachments()
returns trigger
language plpgsql
security definer set search_path = public
as $$
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
$$;

create or replace function public.audit_internal_request_attachment_revisions()
returns trigger
language plpgsql
security definer set search_path = public
as $$
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
$$;
