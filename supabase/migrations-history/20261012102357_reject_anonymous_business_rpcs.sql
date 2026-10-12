-- RLS does not protect SECURITY DEFINER RPCs; reject anonymous identities inside business procedures.
do $rpc_guard$
declare f record; v_definition text; v_updated text;
begin
 for f in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
 where n.nspname='public' and p.prosecdef and l.lanname='plpgsql' and p.prorettype<>'trigger'::regtype
   and p.proname not in ('notify_user','can_manage_department','can_view_audit_entry')
 loop
  v_definition:=pg_get_functiondef(f.oid);
  if v_definition like '%is_anonymous%' then continue; end if;
  v_updated:=regexp_replace(v_definition,'(^|\n)begin[ \t]*\r?\n',E'\nBEGIN\n  IF auth.uid() IS NULL OR coalesce((auth.jwt()->>''is_anonymous'')::boolean,false) THEN RAISE EXCEPTION ''يلزم حساب مسجل'' USING errcode=''42501''; END IF;\n','i');
  if v_updated=v_definition then raise exception 'Cannot locate procedure entry for %',f.proname; end if;
  execute v_updated;
 end loop;
end;
$rpc_guard$;
notify pgrst,'reload schema';
