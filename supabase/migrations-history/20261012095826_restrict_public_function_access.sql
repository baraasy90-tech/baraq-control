-- Current app RPCs require signed-in users; internal trigger/notification functions are not RPCs.
do $$ declare f record; v_policy record; v_using text; v_check text; v_guard constant text:='not coalesce((auth.jwt() ->> ''is_anonymous'')::boolean,false)'; begin
  for f in select n.nspname,p.proname,p.oid::regprocedure as signature,p.prorettype='pg_catalog.trigger'::regtype as is_trigger
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' and p.prosecdef
  loop
    execute format('revoke execute on function %s from public, anon',f.signature);
    if f.is_trigger or f.proname='notify_user' then
      execute format('revoke execute on function %s from authenticated',f.signature);
    end if;
  end loop;
  -- These application and private Storage policies were explicitly scoped to signed-in identities.
  -- TO authenticated alone does not exclude anonymous sign-in accounts; add a trusted JWT check.
  for v_policy in select * from pg_policies where schemaname in ('public','storage') and roles='{public}'::name[]
  loop
    v_using:=case when v_policy.qual is null then null else '('||v_policy.qual||') and ('||v_guard||')' end;
    v_check:=case when v_policy.cmd in ('INSERT','UPDATE','ALL') then '('||coalesce(v_policy.with_check,v_policy.qual,'true')||') and ('||v_guard||')' else null end;
    execute format('alter policy %I on %I.%I to authenticated%s%s',v_policy.policyname,v_policy.schemaname,v_policy.tablename,
      case when v_using is null then '' else ' using ('||v_using||')' end,
      case when v_check is null then '' else ' with check ('||v_check||')' end);
  end loop;
end $$;
create or replace function public.generate_company_code()
returns text language sql set search_path='' as $$
 select pg_catalog.upper(pg_catalog.substr(pg_catalog.encode(extensions.gen_random_bytes(8),'hex'),1,10));
$$;
notify pgrst,'reload schema';

