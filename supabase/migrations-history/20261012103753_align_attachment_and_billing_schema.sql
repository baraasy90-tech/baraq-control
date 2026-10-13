-- Production inventory on 2026-10-12 confirmed there are no material attachment rows to classify.
alter table public.material_request_attachments add column if not exists phase text not null default 'sample' check(phase in ('sample','purchase'));
-- A RETURNS TABLE shape change requires dropping this leaf RPC; do not use CASCADE.
drop function public.list_all_companies_billing();
create function public.list_all_companies_billing()
returns table(id uuid,name text,subscription_status text,trial_ends_at timestamptz,subscription_note text,subscription_updated_at timestamptz,created_at timestamptz,member_count bigint,is_individual boolean)
language sql stable security definer set search_path='' as $$
 select c.id,c.name,c.subscription_status,c.trial_ends_at,c.subscription_note,c.subscription_updated_at,c.created_at,
 (select count(*) from public.profiles p where p.company_id=c.id),c.is_individual
 from public.companies c where public.is_platform_admin() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 order by c.created_at desc;
$$;
revoke all on function public.list_all_companies_billing() from public,anon;
grant execute on function public.list_all_companies_billing() to authenticated,service_role;
notify pgrst,'reload schema';
