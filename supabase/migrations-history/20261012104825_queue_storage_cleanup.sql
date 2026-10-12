create table app_private.storage_cleanup_queue(
 id uuid primary key default gen_random_uuid(),bucket text not null,path text not null,owner_id text not null,
 company_id uuid not null,queued_at timestamptz not null default now(),locked_until timestamptz,
 attempts integer not null default 0,last_error text,unique(bucket,path)
);
alter table app_private.storage_cleanup_queue enable row level security;
revoke all on app_private.storage_cleanup_queue from public,anon,authenticated;
grant select,insert,update,delete on app_private.storage_cleanup_queue to service_role;

create function app_private.storage_path(p_bucket text,p_stored text)
returns text language plpgsql immutable set search_path='' as $$
declare v_path text:=p_stored;v_marker text:='/object/sign/'||p_bucket||'/';v_index integer;begin
 if v_path is null then return null;end if;
 v_index:=strpos(v_path,v_marker);
 if v_index>0 then v_path:=split_part(substr(v_path,v_index+length(v_marker)),'?',1);end if;
 v_path:=replace(replace(v_path,'%2F','/'),'%2f','/');
 if v_path !~ '^[0-9a-fA-F-]{36}/[a-zA-Z0-9_.-]+$' then return null;end if;
 return v_path;
end;$$;
revoke all on function app_private.storage_path(text,text) from public,anon,authenticated;

create function app_private.storage_reference_exists(p_bucket text,p_path text)
returns boolean language plpgsql security definer set search_path='' as $$
declare c record;v_exists boolean;begin
 for c in select table_name,column_name from information_schema.columns where table_schema='public' and data_type='text' and column_name like '%\_url' escape '\'
 loop
  execute format('select exists(select 1 from public.%I where app_private.storage_path($1,%I)=$2)',c.table_name,c.column_name) into v_exists using p_bucket,p_path;
  if v_exists then return true;end if;
 end loop;
 return false;
end;$$;
revoke all on function app_private.storage_reference_exists(text,text) from public,anon,authenticated;

create function app_private.track_storage_reference()
returns trigger language plpgsql security definer set search_path='' as $$
declare i integer;v_column text;v_bucket text;v_old text;v_new text;v_company uuid;v_owner text;v_locked timestamptz;begin
 for i in 0..tg_nargs-1 loop
  v_column:=split_part(tg_argv[i],':',1);v_bucket:=split_part(tg_argv[i],':',2);
  v_old:=case when tg_op='INSERT' then null else app_private.storage_path(v_bucket,to_jsonb(old)->>v_column) end;
  v_new:=case when tg_op='DELETE' then null else app_private.storage_path(v_bucket,to_jsonb(new)->>v_column) end;
  if v_new is not null then
   select locked_until into v_locked from app_private.storage_cleanup_queue where bucket=v_bucket and path=v_new for update;
   if found then
    if v_locked>clock_timestamp() then raise exception 'الملف قيد التنظيف؛ ارفع نسخة جديدة أو أعد المحاولة لاحقاً';end if;
    delete from app_private.storage_cleanup_queue where bucket=v_bucket and path=v_new;
   end if;
  end if;
  if v_old is not null and v_old is distinct from v_new and auth.uid() is not null then
   v_company:=public.current_company_id();
   select coalesce(o.owner_id,o.owner::text) into v_owner from storage.objects o join public.profiles p on p.id::text=coalesce(o.owner_id,o.owner::text)
    where o.bucket_id=v_bucket and o.name=v_old and p.company_id=v_company;
   if found and v_company is not null then
    insert into app_private.storage_cleanup_queue(bucket,path,owner_id,company_id) values(v_bucket,v_old,v_owner,v_company)
    on conflict(bucket,path) do update set queued_at=now(),locked_until=null,attempts=0,last_error=null;
   end if;
  end if;
 end loop;
 if tg_op='DELETE' then return old;end if;return new;
end;$$;
revoke all on function app_private.track_storage_reference() from public,anon,authenticated;

do $storage_triggers$ declare t record;v_args text;begin
 for t in select distinct table_name from information_schema.columns where table_schema='public' and data_type='text' and column_name like '%\_url' escape '\'
 loop
  select string_agg(quote_literal(column_name||':'||case when column_name='image_url' then 'checklist-photos' when column_name like '%signature_url' then 'signatures' when column_name='logo_url' or column_name like 'print_%_url' then 'company-logos' else 'documents' end),',') into v_args
   from information_schema.columns where table_schema='public' and table_name=t.table_name and data_type='text' and column_name like '%\_url' escape '\';
  execute format('create trigger track_storage_reference before insert or update or delete on public.%I for each row execute function app_private.track_storage_reference(%s)',t.table_name,v_args);
 end loop;
end;$storage_triggers$;

create function public.claim_storage_cleanup(p_limit integer default 20)
returns table(id uuid,bucket text,path text) language plpgsql security definer set search_path='' as $$
declare q app_private.storage_cleanup_queue;v_owner text;v_updated timestamptz;begin
 for q in select * from app_private.storage_cleanup_queue s where (s.locked_until is null or s.locked_until<clock_timestamp()) and s.attempts<10 order by s.queued_at limit greatest(1,least(coalesce(p_limit,20),50)) for update skip locked
 loop
  if app_private.storage_reference_exists(q.bucket,q.path) then delete from app_private.storage_cleanup_queue s where s.id=q.id;continue;end if;
  select coalesce(o.owner_id,o.owner::text),o.updated_at into v_owner,v_updated from storage.objects o where o.bucket_id=q.bucket and o.name=q.path;
  if found and (v_owner is distinct from q.owner_id or v_updated>q.queued_at) then update app_private.storage_cleanup_queue s set attempts=10,last_error='Object ownership or generation changed; manual review required' where s.id=q.id;continue;end if;
  update app_private.storage_cleanup_queue s set locked_until=clock_timestamp()+interval '20 minutes',attempts=s.attempts+1 where s.id=q.id;
  id:=q.id;bucket:=q.bucket;path:=q.path;return next;
 end loop;
end;$$;
revoke all on function public.claim_storage_cleanup(integer) from public,anon,authenticated;
grant execute on function public.claim_storage_cleanup(integer) to service_role;
create function public.finish_storage_cleanup(p_id uuid,p_error text default null)
returns void language plpgsql security definer set search_path='' as $$begin
 if p_error is null then delete from app_private.storage_cleanup_queue where id=p_id;
 else update app_private.storage_cleanup_queue set locked_until=null,last_error=left(p_error,500) where id=p_id;end if;
end;$$;
revoke all on function public.finish_storage_cleanup(uuid,text) from public,anon,authenticated;
grant execute on function public.finish_storage_cleanup(uuid,text) to service_role;
notify pgrst,'reload schema';
