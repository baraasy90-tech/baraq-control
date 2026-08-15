-- إصلاح: أسماء أعمدة RETURNS TABLE في join_company_by_code كانت تتطابق حرفياً مع
-- عمود profiles.company_id، فصار مرجع company_id غامضاً (متغيّر الدالة أم عمود الجدول)
-- عند تنفيذ UPDATE داخل الدالة. الحل: تسمية مخرجات الدالة بأسماء مختلفة تماماً.

create or replace function public.join_company_by_code(p_code text)
returns table (result_company_id uuid, result_company_name text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_company record;
  v_dept_id uuid;
begin
  select * into v_company from public.companies where company_code = upper(trim(p_code));
  if not found then
    raise exception 'رمز الشركة غير صحيح';
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
$$;

grant execute on function public.join_company_by_code(text) to authenticated;
