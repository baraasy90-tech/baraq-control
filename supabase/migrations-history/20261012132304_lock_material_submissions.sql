-- Read the workflow state under a request-row lock before creating an approval chain.
DO $lock_requests$
DECLARE f record; definition text; updated text; found_count integer := 0;
BEGIN
  FOR f IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('submit_material_sourcing','submit_material_purchase_chain')
  LOOP
    found_count := found_count + 1;
    definition := pg_get_functiondef(f.oid);
    updated := replace(definition,
      'from public.material_requests where id = p_request_id;',
      'from public.material_requests where id = p_request_id for update;');
    IF updated=definition AND definition NOT LIKE '%where id = p_request_id for update;%' THEN
      RAISE EXCEPTION 'Cannot find material request lock anchor in %',f.proname;
    END IF;
    EXECUTE updated;
  END LOOP;
  IF found_count<>2 THEN RAISE EXCEPTION 'Expected both material submission procedures'; END IF;
END;
$lock_requests$;
NOTIFY pgrst,'reload schema';
