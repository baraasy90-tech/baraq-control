BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef AND has_function_privilege('anon',p.oid,'EXECUTE')) THEN RAISE EXCEPTION 'Privileged function still callable by anon'; END IF;
 IF has_function_privilege('authenticated','public.notify_user(uuid,uuid,text,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Notification writer is callable directly'; END IF;
 IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prorettype='trigger'::regtype AND has_function_privilege('authenticated',p.oid,'EXECUTE')) THEN RAISE EXCEPTION 'Trigger function callable directly'; END IF;
 IF public.generate_company_code() !~ '^[A-F0-9]{10}$' THEN RAISE EXCEPTION 'Company code generation failed'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.projects) THEN RAISE EXCEPTION 'Visitor can read projects'; END IF; END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":true}',true);
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.projects) OR EXISTS(SELECT 1 FROM public.profiles) THEN RAISE EXCEPTION 'Anonymous identity can read app rows'; END IF; END $$;
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":false}',true);
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.projects) THEN RAISE EXCEPTION 'Normal member lost project access'; END IF; RAISE NOTICE 'PASS visitor, anonymous-identity denial and normal member access'; END $$;
ROLLBACK;
