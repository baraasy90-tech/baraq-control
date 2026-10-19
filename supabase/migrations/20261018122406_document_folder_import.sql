-- Broader document formats; image-only buckets and private access are unchanged.
update storage.buckets set file_size_limit=50*1024*1024,allowed_mime_types=array[
 'application/octet-stream','application/pdf','image/jpeg','image/png','image/webp','image/gif','image/bmp','image/tiff',
 'text/plain','text/csv','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint',
 'application/vnd.openxmlformats-officedocument.presentationml.presentation','application/zip','application/x-zip-compressed',
 'video/mp4','video/webm','video/quicktime','audio/mpeg','audio/mp4','audio/wav','audio/ogg'] where id='documents';

create index if not exists document_folders_import_lookup on public.document_folders(project_id,parent_folder_id,name);

create function public.ensure_document_folder(p_project_id uuid,p_parent_folder_id uuid,p_name text,p_id uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare found_ids uuid[]; clean_name text:=btrim(p_name);
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or not public.can_access_project(p_project_id) then
   raise exception 'لا تملك صلاحية الوصول إلى المشروع' using errcode='42501';
 end if;
 if clean_name is null or clean_name in ('','.','..') or length(clean_name)>255 or clean_name ~ '[/\\[:cntrl:]]' then
   raise exception 'اسم المجلد غير صالح' using errcode='22023';
 end if;
 if p_parent_folder_id is not null and not exists(select 1 from public.document_folders where id=p_parent_folder_id and project_id=p_project_id) then
   raise exception 'المجلد الأب غير متاح ضمن المشروع' using errcode='42501';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_project_id::text||coalesce(p_parent_folder_id::text,'root')||clean_name,0));
 select array_agg(id order by id) into found_ids from public.document_folders where project_id=p_project_id
  and parent_folder_id is not distinct from p_parent_folder_id and name=clean_name;
 if cardinality(found_ids)>1 then raise exception 'يوجد أكثر من مجلد بهذا الاسم؛ أعد تسمية المجلدات المتكررة أولاً' using errcode='22023'; end if;
 if cardinality(found_ids)=1 then return found_ids[1]; end if;
 insert into public.document_folders(id,project_id,parent_folder_id,name) values(p_id,p_project_id,p_parent_folder_id,clean_name);
 return p_id;
end;
$$;
revoke all on function public.ensure_document_folder(uuid,uuid,text,uuid) from public,anon;
grant execute on function public.ensure_document_folder(uuid,uuid,text,uuid) to authenticated;
