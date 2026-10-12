BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":true}',true);
DO $$ BEGIN
 BEGIN PERFORM public.review_budget_entry('10000000-0000-0000-0000-000000000601',true,null); RAISE EXCEPTION 'Anonymous budget RPC accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.create_individual_account('Anonymous test'); RAISE EXCEPTION 'Anonymous company RPC accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.join_company_by_code('INVALID'); RAISE EXCEPTION 'Anonymous join RPC accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RAISE NOTICE 'PASS anonymous authenticated accounts rejected inside privileged business RPCs';
END $$;
ROLLBACK;
