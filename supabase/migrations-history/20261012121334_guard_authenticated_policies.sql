-- Anonymous sign-ins also use authenticated. A restrictive policy combines with
-- every existing permissive policy, including those already scoped to authenticated.
DO $guard$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT n.nspname, c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p') AND c.relrowsecurity
      AND (n.nspname = 'public' OR (n.nspname = 'storage' AND c.relname = 'objects'))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS require_permanent_account ON %I.%I', target.nspname, target.relname);
    EXECUTE format(
      'CREATE POLICY require_permanent_account ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated '
      'USING (auth.uid() IS NOT NULL AND NOT coalesce((auth.jwt()->>''is_anonymous'')::boolean, false)) '
      'WITH CHECK (auth.uid() IS NOT NULL AND NOT coalesce((auth.jwt()->>''is_anonymous'')::boolean, false))',
      target.nspname, target.relname);
  END LOOP;
END;
$guard$;
NOTIFY pgrst, 'reload schema';
