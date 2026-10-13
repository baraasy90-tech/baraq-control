-- All actions on a chain acquire the same parent lock before reading or changing any step.
do $chain_lock$ declare f record;v_definition text;v_updated text;v_prefix text;v_chain text;v_steps text;
begin
 for f in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
 'review_approval_step','route_approval_step','reroute_approval_step','send_back_approval_step','insert_approval_step',
 'review_internal_approval_step','route_internal_approval_step','reroute_internal_approval_step','send_back_internal_approval_step','insert_internal_approval_step')
 loop
  v_chain:=case when f.proname like '%internal%' then 'internal_approval_chains' else 'approval_chains' end;
  v_steps:=case when f.proname like '%internal%' then 'internal_approval_chain_steps' else 'approval_chain_steps' end;
  v_prefix:=format(E'\nBEGIN\n  IF auth.uid() IS NULL OR coalesce((auth.jwt()->>''is_anonymous'')::boolean,false) THEN RAISE EXCEPTION ''يلزم حساب مسجل'' USING errcode=''42501''; END IF;\n  PERFORM 1 FROM public.%I c WHERE c.id=(SELECT s.chain_id FROM public.%I s WHERE s.id=p_step_id) FOR UPDATE OF c;\n  IF NOT FOUND THEN RAISE EXCEPTION ''خطوة الاعتماد غير موجودة''; END IF;\n',v_chain,v_steps);
  v_definition:=pg_get_functiondef(f.oid);
  v_updated:=regexp_replace(v_definition,'(^|\n)begin[ \t]*\r?\n',v_prefix,'i');
  if v_updated=v_definition then raise exception 'Cannot locate chain action %',f.proname; end if;
  execute v_updated;
 end loop;
end;
$chain_lock$;
notify pgrst,'reload schema';
