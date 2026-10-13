BEGIN;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind IN ('r','p') AND c.relrowsecurity
      AND (n.nspname='public' OR (n.nspname='storage' AND c.relname='objects'))
      AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid=c.oid
        AND p.polname='require_permanent_account' AND NOT p.polpermissive)
  ) THEN RAISE EXCEPTION 'Missing restrictive permanent-account policy'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":true}',true);
DO $$ DECLARE target record; count_rows bigint; BEGIN
  FOR target IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('SELECT count(*) FROM public.%I',target.tablename) INTO count_rows;
    IF count_rows<>0 THEN RAISE EXCEPTION 'Anonymous identity can read %',target.tablename; END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM storage.objects) THEN RAISE EXCEPTION 'Anonymous identity can read files'; END IF;
END $$;
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":false}',true);
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.projects) THEN RAISE EXCEPTION 'Normal member lost project access'; END IF;
  RAISE NOTICE 'PASS all application tables and Storage deny anonymous identities; normal member retains access';
END $$;
ROLLBACK;
