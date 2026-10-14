-- Display only the selected tenant's account metadata; never expose Auth secrets.
create index if not exists profiles_company_created_directory_idx on public.profiles(company_id,created_at desc,id);
create function public.list_platform_company_users(p_company_id uuid,p_offset integer default 0,p_search text default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; search_term text:=lower(btrim(coalesce(p_search,'')));
begin
 if not public.has_platform_admin_access() or exists(select 1 from auth.users u where u.id=auth.uid() and u.banned_until>now()) then raise exception 'دليل المستخدمين محصور بإدارة المنصة والتحقق بخطوتين' using errcode='42501'; end if;
 if p_company_id is null or not exists(select 1 from public.companies where id=p_company_id) then raise exception 'الحساب المطلوب غير موجود'; end if;
 if p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'صفحة غير صحيحة'; end if;
 if length(search_term)>200 then raise exception 'عبارة البحث أطول من الحد المسموح'; end if;
 with matching as materialized (
  select p.id,p.full_name,p.created_at,u.email,u.last_sign_in_at,
    u.email_confirmed_at is not null as email_confirmed,
    coalesce(u.banned_until>now(),false) as sign_in_blocked,
    coalesce(c.created_by=p.id,false) as is_company_owner
  from public.profiles p join auth.users u on u.id=p.id join public.companies c on c.id=p.company_id
  where p.company_id=p_company_id and (search_term='' or strpos(lower(coalesce(p.full_name,'')||' '||coalesce(u.email,'')),search_term)>0)
 ), page as (select * from matching order by created_at desc,id limit 50 offset p_offset)
 select jsonb_build_object('total',(select count(*) from matching),'offset',p_offset,'page_size',50,
  'users',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('departments',coalesce(d.roles,'[]'::jsonb)) order by p.created_at desc,p.id)
   from page p left join lateral (
    select jsonb_agg(jsonb_build_object('name',dep.name,'role',m.role) order by dep.name,dep.id) as roles
    from public.department_members m join public.departments dep on dep.id=m.department_id
    where m.user_id=p.id and dep.company_id=p_company_id
   ) d on true),'[]'::jsonb)) into result;
 return result;
end;
$$;
revoke all on function public.list_platform_company_users(uuid,integer,text) from public,anon;
grant execute on function public.list_platform_company_users(uuid,integer,text) to authenticated;
notify pgrst,'reload schema';
