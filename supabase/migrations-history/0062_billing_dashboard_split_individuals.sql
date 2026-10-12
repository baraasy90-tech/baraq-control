-- إضافة is_individual لمخرجات لوحة إدارة الاشتراكات — تُستخدم بالواجهة لفصل
-- "الشركات الرئيسية" عن "الحسابات الفردية" بدل عرضهما بقائمة واحدة مختلطة.

create or replace function public.list_all_companies_billing()
returns table (
  id uuid,
  name text,
  subscription_status text,
  trial_ends_at timestamptz,
  subscription_note text,
  subscription_updated_at timestamptz,
  created_at timestamptz,
  member_count bigint,
  is_individual boolean
)
language sql
security definer set search_path = public
stable
as $$
  select c.id, c.name, c.subscription_status, c.trial_ends_at, c.subscription_note,
         c.subscription_updated_at, c.created_at,
         (select count(*) from public.profiles p where p.company_id = c.id) as member_count,
         c.is_individual
  from public.companies c
  where public.is_platform_admin()
  order by c.created_at desc;
$$;

grant execute on function public.list_all_companies_billing() to authenticated;
