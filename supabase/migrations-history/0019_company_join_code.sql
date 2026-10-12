-- رمز انضمام قصير لكل شركة، يتيح لأي موظف إنشاء حسابه بنفسه والانضمام مباشرة
-- (كعضو بقسم "إدارة المشاريع" الافتراضي) دون الحاجة لدعوة بريدية من المدير —
-- مفيد خصوصاً للاختبار السريع وللفرق الصغيرة.

create or replace function public.generate_company_code()
returns text
language sql
volatile
as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
$$;

alter table public.companies add column company_code text unique not null default public.generate_company_code();

create or replace function public.join_company_by_code(p_code text)
returns table (company_id uuid, company_name text)
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
