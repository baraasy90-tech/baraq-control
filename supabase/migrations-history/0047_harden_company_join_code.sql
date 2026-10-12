-- إصلاح H2(ب) من تدقيق RLS: رمز انضمام الشركة كان 6 خانات hex فقط (16.7 مليون
-- احتمال) بدون أي انتهاء صلاحية — قابل للتخمين بالقوة الغاشمة عبر استدعاء متكرر
-- لـ join_company_by_code، وأي من يخمنه (ولو لمرة واحدة) يدخل شركة عشوائية للأبد.
--
-- الإصلاح: رمز أطول بكثير (10 خانات hex ≈ 1.1 تريليون احتمال) + انتهاء صلاحية
-- (30 يوماً) + دالة تجديد صريحة لمالك/تنفيذي الشركة. كل الرموز الحالية تُجدَّد فوراً
-- بهذا التنفيذ لأن الرموز القديمة الضعيفة قد تكون تعرّضت لمحاولات تخمين سابقاً.

alter table public.companies add column if not exists company_code_expires_at timestamptz;

create or replace function public.generate_company_code()
returns text
language sql
volatile
as $$
  select upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));
$$;

update public.companies
set company_code = public.generate_company_code(),
    company_code_expires_at = now() + interval '30 days';

alter table public.companies alter column company_code set default public.generate_company_code();

create or replace function public.join_company_by_code(p_code text)
returns table (result_company_id uuid, result_company_name text)
language plpgsql
security definer set search_path = public
as $$
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
$$;

grant execute on function public.join_company_by_code(text) to authenticated;

create or replace function public.regenerate_company_code(p_company_id uuid)
returns table (result_company_code text, result_expires_at timestamptz)
language plpgsql
security definer set search_path = public
as $$
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
$$;

grant execute on function public.regenerate_company_code(uuid) to authenticated;
