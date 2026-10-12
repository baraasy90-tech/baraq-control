-- Validate storage references and serialize them with cleanup claims.
create table app_private.storage_orphan_scan_state(id boolean primary key default true check(id),last_object_id uuid,scanned_at timestamptz not null default now());
alter table app_private.storage_orphan_scan_state enable row level security;
revoke all on app_private.storage_orphan_scan_state from public,anon,authenticated;
create function public.enqueue_storage_orphans(p_limit integer default 100,p_min_age_hours integer default 24)
returns integer language plpgsql security definer set search_path='' as $$
declare v_cursor uuid;v_last uuid;v_count integer:=0;v_inserted integer;v_company uuid;v_owner text;o record;
begin
 insert into app_private.storage_orphan_scan_state(id) values(true) on conflict(id) do nothing;
 select last_object_id into v_cursor from app_private.storage_orphan_scan_state where id=true for update;
 for o in select * from storage.objects s where s.bucket_id in ('documents','signatures','checklist-photos','company-logos') and (v_cursor is null or s.id>v_cursor)
  and s.created_at<clock_timestamp()-make_interval(hours=>greatest(24,least(coalesce(p_min_age_hours,24),720))) and s.updated_at<clock_timestamp()-make_interval(hours=>greatest(24,least(coalesce(p_min_age_hours,24),720)))
  order by s.id limit greatest(1,least(coalesce(p_limit,100),500))
 loop
  v_last:=o.id;
  if app_private.storage_path(o.bucket_id,o.name) is null then continue;end if;
  if not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended(o.bucket_id||':'||o.name,0)) then continue;end if;
  v_owner:=coalesce(o.owner_id,o.owner::text,split_part(o.name,'/',1));
  select company_id into v_company from public.profiles where id::text=v_owner;
  if not found or v_company is null or app_private.storage_reference_exists(o.bucket_id,o.name) then continue;end if;
  insert into app_private.storage_cleanup_queue(bucket,path,owner_id,company_id) values(o.bucket_id,o.name,v_owner,v_company) on conflict(bucket,path) do nothing;
  get diagnostics v_inserted=row_count;v_count:=v_count+v_inserted;
 end loop;
 update app_private.storage_orphan_scan_state set last_object_id=v_last,scanned_at=clock_timestamp() where id=true;
 return v_count;
end;$$;
revoke all on function public.enqueue_storage_orphans(integer,integer) from public,anon,authenticated;
grant execute on function public.enqueue_storage_orphans(integer,integer) to service_role;
create or replace function app_private.track_storage_reference()
returns trigger language plpgsql security definer set search_path='' as $$
declare i integer;v_column text;v_bucket text;v_old text;v_new text;v_company uuid;v_owner text;v_locked timestamptz;v_lock text;begin
 for i in 0..tg_nargs-1 loop
  v_column:=split_part(tg_argv[i],':',1);v_bucket:=split_part(tg_argv[i],':',2);
  v_old:=case when tg_op='INSERT' then null else app_private.storage_path(v_bucket,to_jsonb(old)->>v_column) end;
  v_new:=case when tg_op='DELETE' then null else app_private.storage_path(v_bucket,to_jsonb(new)->>v_column) end;
  for v_lock in select distinct value from unnest(array[v_old,v_new]) as value where value is not null order by value loop
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_bucket||':'||v_lock,0));
  end loop;
  if v_new is not null then
   if v_new is distinct from v_old and auth.uid() is not null then
    perform 1 from storage.objects o left join public.profiles p on p.id::text=coalesce(o.owner_id,o.owner::text,split_part(o.name,'/',1)) where o.bucket_id=v_bucket and o.name=v_new and (coalesce(o.owner_id,o.owner::text,split_part(o.name,'/',1))=auth.uid()::text or p.company_id=public.current_company_id());
    if not found then raise exception 'الملف غير موجود أو لا تملك صلاحية الوصول؛ أعد رفع الملف' using errcode='42501';end if;
   end if;
   select locked_until into v_locked from app_private.storage_cleanup_queue where bucket=v_bucket and path=v_new for update;
   if found then
    if v_locked>clock_timestamp() then raise exception 'الملف قيد التنظيف؛ ارفع نسخة جديدة أو أعد المحاولة لاحقاً';end if;
    delete from app_private.storage_cleanup_queue where bucket=v_bucket and path=v_new;
   end if;
  end if;
  if v_old is not null and v_old is distinct from v_new and auth.uid() is not null then
   v_company:=public.current_company_id();
   select coalesce(o.owner_id,o.owner::text,split_part(o.name,'/',1)) into v_owner from storage.objects o join public.profiles p on p.id::text=coalesce(o.owner_id,o.owner::text,split_part(o.name,'/',1))
    where o.bucket_id=v_bucket and o.name=v_old and p.company_id=v_company;
   if found and v_company is not null then
    insert into app_private.storage_cleanup_queue(bucket,path,owner_id,company_id) values(v_bucket,v_old,v_owner,v_company)
    on conflict(bucket,path) do update set queued_at=now(),locked_until=null,attempts=0,last_error=null;
   end if;
  end if;
 end loop;
 if tg_op='DELETE' then return old;end if;return new;
end;$$;

create or replace function public.claim_storage_cleanup(p_limit integer default 20)
returns table(id uuid,bucket text,path text) language plpgsql security definer set search_path='' as $$
declare q app_private.storage_cleanup_queue;v_owner text;v_updated timestamptz;begin
 for q in select * from app_private.storage_cleanup_queue s where (s.locked_until is null or s.locked_until<clock_timestamp()) and s.attempts<10 order by s.queued_at limit greatest(1,least(coalesce(p_limit,20),50)) for update skip locked
 loop
  if not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended(q.bucket||':'||q.path,0)) then continue;end if;
  if app_private.storage_reference_exists(q.bucket,q.path) then delete from app_private.storage_cleanup_queue s where s.id=q.id;continue;end if;
  select coalesce(o.owner_id,o.owner::text,split_part(o.name,'/',1)),o.updated_at into v_owner,v_updated from storage.objects o where o.bucket_id=q.bucket and o.name=q.path;
  if found and (v_owner is distinct from q.owner_id or v_updated>q.queued_at) then update app_private.storage_cleanup_queue s set attempts=10,last_error='Object ownership or generation changed; manual review required' where s.id=q.id;continue;end if;
  update app_private.storage_cleanup_queue s set locked_until=clock_timestamp()+interval '20 minutes',attempts=s.attempts+1 where s.id=q.id;
  id:=q.id;bucket:=q.bucket;path:=q.path;return next;
 end loop;
end;$$;
