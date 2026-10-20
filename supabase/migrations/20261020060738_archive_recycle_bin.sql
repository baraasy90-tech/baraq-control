-- Keep archive records and object references intact until an explicit future retention policy.
create table public.document_trash (
 id uuid primary key,project_id uuid not null references public.projects(id) on delete cascade,
 root_kind text not null check(root_kind in ('folder','document')),root_id uuid not null,name text not null,
 original_parent_id uuid,deleted_at timestamptz not null default now(),deleted_by uuid not null,
 folder_count integer not null default 0,document_count integer not null default 0,
 restored_at timestamptz,restored_by uuid
);
alter table public.document_trash enable row level security;
revoke all on public.document_trash from public,anon,authenticated;
grant select on public.document_trash to authenticated;
create policy project_trash_read on public.document_trash for select to authenticated using(auth.uid() is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and public.can_access_project(project_id));
create index document_trash_project_history on public.document_trash(project_id,deleted_at desc,id desc) where restored_at is null;
alter table public.document_folders add column trashed_at timestamptz,add column trash_batch_id uuid references public.document_trash(id) deferrable initially deferred,add check((trashed_at is null)=(trash_batch_id is null));
alter table public.documents add column trashed_at timestamptz,add column trash_batch_id uuid references public.document_trash(id) deferrable initially deferred,add check((trashed_at is null)=(trash_batch_id is null));
create index document_folders_trash_batch on public.document_folders(trash_batch_id) where trash_batch_id is not null;
create index documents_trash_batch on public.documents(trash_batch_id) where trash_batch_id is not null;
create index document_folders_live_project on public.document_folders(project_id,name,id) where trashed_at is null;
create index documents_live_folder on public.documents(folder_id,uploaded_at desc,id) where trashed_at is null;

create function public.trash_project_archive(p_project_id uuid,p_kind text,p_root_id uuid,p_request_id uuid,p_expected_version integer default null,p_expected_name text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare batch public.document_trash%rowtype;folder public.document_folders%rowtype;doc public.documents%rowtype;folder_ids uuid[];v_name text;v_parent uuid;v_company uuid;folders_changed integer:=0;docs_changed integer:=0;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or not coalesce(public.can_access_project(p_project_id),false) then raise exception 'لا تملك صلاحية الوصول إلى المشروع' using errcode='42501';end if;
 if p_kind is null or p_kind not in ('folder','document') or p_request_id is null then raise exception 'طلب نقل إلى السلة غير صالح';end if;
 select company_id into v_company from public.projects where id=p_project_id;
 perform platform_private.assert_company_writable(v_company);
 -- Shared locks in normal archive writes allow concurrent uploads; this lock stabilizes the subtree.
 perform 1 from public.projects where id=p_project_id for update;
 select * into batch from public.document_trash where id=p_request_id;
 if found then
  if batch.project_id<>p_project_id or batch.root_kind<>p_kind or batch.root_id<>p_root_id then raise exception 'معرّف عملية مستخدم لعنصر آخر';end if;
  if batch.restored_at is not null then raise exception 'استُعيد هذا العنصر بعد الطلب السابق؛ حدّث القائمة قبل إجراء جديد';end if;
  return batch.id;
 end if;
 if p_kind='folder' then
  select * into folder from public.document_folders where id=p_root_id and project_id=p_project_id for update nowait;
  if not found then raise exception 'المجلد غير متاح ضمن المشروع';end if;
  if folder.trashed_at is not null then return folder.trash_batch_id;end if;
  if p_expected_name is not null and folder.name<>p_expected_name then raise exception 'تغير المجلد؛ حدّث القائمة قبل نقله إلى السلة';end if;
  v_name:=folder.name;v_parent:=folder.parent_folder_id;
  with recursive descendants as (
   select id from public.document_folders where id=p_root_id and project_id=p_project_id
   union select f.id from public.document_folders f join descendants d on f.parent_folder_id=d.id where f.project_id=p_project_id
  )select array_agg(id) into folder_ids from descendants;
  perform 1 from public.document_folders where id=any(folder_ids) order by id for update nowait;
  perform 1 from public.documents where folder_id=any(folder_ids) order by id for update nowait;
 else
  select d.* into doc from public.documents d join public.document_folders f on f.id=d.folder_id where d.id=p_root_id and f.project_id=p_project_id for update of d nowait;
  if not found then raise exception 'المستند غير متاح ضمن المشروع';end if;
  if doc.trashed_at is not null then return doc.trash_batch_id;end if;
  if p_expected_version is not null and doc.row_version<>p_expected_version then raise exception 'تغير المستند؛ حدّث القائمة قبل نقله إلى السلة';end if;
  if exists(select 1 from public.document_folders where id=doc.folder_id and trashed_at is not null) then raise exception 'المجلد الحاوي موجود في السلة';end if;
  v_name:=doc.name;v_parent:=doc.folder_id;
 end if;
 insert into public.document_trash(id,project_id,root_kind,root_id,name,original_parent_id,deleted_by) values(p_request_id,p_project_id,p_kind,p_root_id,v_name,v_parent,auth.uid());
 if p_kind='folder' then
  update public.document_folders set trashed_at=now(),trash_batch_id=p_request_id where id=any(folder_ids) and project_id=p_project_id and trashed_at is null;get diagnostics folders_changed=row_count;
  update public.documents set trashed_at=now(),trash_batch_id=p_request_id where folder_id=any(folder_ids) and trashed_at is null;get diagnostics docs_changed=row_count;
 else
  update public.documents set trashed_at=now(),trash_batch_id=p_request_id where id=p_root_id and trashed_at is null;get diagnostics docs_changed=row_count;
 end if;
 update public.document_trash set folder_count=folders_changed,document_count=docs_changed where id=p_request_id;
 return p_request_id;
exception when lock_not_available or deadlock_detected then raise exception 'بعض عناصر الأرشيف قيد التعديل؛ انتظر اكتمال العملية وأعد المحاولة' using errcode='55P03';
end;$$;

create function public.restore_project_archive(p_project_id uuid,p_batch_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare batch public.document_trash%rowtype;folder public.document_folders%rowtype;v_company uuid;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or not coalesce(public.can_access_project(p_project_id),false) then raise exception 'لا تملك صلاحية الوصول إلى المشروع' using errcode='42501';end if;
 select company_id into v_company from public.projects where id=p_project_id;perform platform_private.assert_company_writable(v_company);
 perform 1 from public.projects where id=p_project_id for update;
 select * into batch from public.document_trash where id=p_batch_id and project_id=p_project_id for update;
 if not found then raise exception 'العنصر غير متاح في سلة المشروع';end if;
 if batch.restored_at is not null then return batch.root_id;end if;
 perform 1 from public.document_folders where trash_batch_id=batch.id order by id for update nowait;
 perform 1 from public.documents where trash_batch_id=batch.id order by id for update nowait;
 if batch.root_kind='folder' then
  select * into folder from public.document_folders where id=batch.root_id and trash_batch_id=batch.id;
  if not found then raise exception 'تعذّر التحقق من مجلد الاستعادة';end if;
  if folder.parent_folder_id is not null and not exists(select 1 from public.document_folders where id=folder.parent_folder_id and project_id=p_project_id and trashed_at is null) then raise exception 'استعد المجلد الأب من السلة أولاً';end if;
  if exists(select 1 from public.document_folders f where f.project_id=p_project_id and f.parent_folder_id is not distinct from folder.parent_folder_id and f.name=folder.name and f.trashed_at is null and f.id<>folder.id) then raise exception 'يوجد مجلد بنفس الاسم في موقع الاستعادة؛ أعد تسمية المجلد الحالي أولاً';end if;
 else
  if not exists(select 1 from public.documents d join public.document_folders f on f.id=d.folder_id where d.id=batch.root_id and d.trash_batch_id=batch.id and f.project_id=p_project_id and f.trashed_at is null) then raise exception 'استعد المجلد الحاوي من السلة أولاً';end if;
 end if;
 update public.document_folders set trashed_at=null,trash_batch_id=null where trash_batch_id=batch.id;
 update public.documents set trashed_at=null,trash_batch_id=null where trash_batch_id=batch.id;
 update public.document_trash set restored_at=now(),restored_by=auth.uid() where id=batch.id;
 return batch.root_id;
exception when lock_not_available or deadlock_detected then raise exception 'بعض عناصر الأرشيف قيد التعديل؛ انتظر اكتمال العملية وأعد المحاولة' using errcode='55P03';
end;$$;
revoke all on function public.trash_project_archive(uuid,text,uuid,uuid,integer,text),public.restore_project_archive(uuid,uuid) from public,anon;
grant execute on function public.trash_project_archive(uuid,text,uuid,uuid,integer,text),public.restore_project_archive(uuid,uuid) to authenticated;

create function app_private.guard_live_archive_write() returns trigger language plpgsql security invoker set search_path='' as $$
declare v_project uuid;v_parent_project uuid;v_parent_trashed timestamptz;old_project uuid;
begin
 if current_user not in ('authenticated','anon') then return new;end if;
 if new.trashed_at is not null or new.trash_batch_id is not null or (tg_op='UPDATE' and (old.trashed_at is not null or old.trash_batch_id is not null)) then raise exception 'تعديل عناصر السلة أو حالتها متاح من مسار الاستعادة فقط' using errcode='42501';end if;
 if tg_table_name='document_folders' then
  v_project:=new.project_id;
  if tg_op='UPDATE' and row(new.project_id,new.parent_folder_id) is distinct from row(old.project_id,old.parent_folder_id) then raise exception 'نقل المجلدات بين المواقع غير متاح بهذا المسار' using errcode='42501';end if;
 else
  select project_id into v_project from public.document_folders where id=new.folder_id;
  if tg_op='UPDATE' then select project_id into old_project from public.document_folders where id=old.folder_id;end if;
 end if;
 -- Normal writes share project locks; trash/restore takes an exclusive lock before traversing.
 perform 1 from public.projects where id in(v_project,old_project) order by id for share;
 if tg_table_name='document_folders' then
  if new.parent_folder_id is not null then select project_id,trashed_at into v_parent_project,v_parent_trashed from public.document_folders where id=new.parent_folder_id;
   if not found or v_parent_project<>v_project or v_parent_trashed is not null then raise exception 'المجلد الأب غير متاح أو موجود في السلة' using errcode='42501';end if;
  end if;
 else
  select project_id,trashed_at into v_parent_project,v_parent_trashed from public.document_folders where id=new.folder_id;
  if not found or v_parent_trashed is not null then raise exception 'مجلد الوجهة غير متاح أو موجود في السلة' using errcode='42501';end if;
 end if;
 return new;
end;$$;
revoke all on function app_private.guard_live_archive_write() from public,anon,authenticated;
create trigger guard_live_archive_write before insert or update on public.document_folders for each row execute function app_private.guard_live_archive_write();
create trigger guard_live_archive_write before insert or update on public.documents for each row execute function app_private.guard_live_archive_write();

-- Older tabs issuing DELETE are also made recoverable. Trusted maintenance remains possible.
create function app_private.recycle_legacy_archive_delete() returns trigger language plpgsql security definer set search_path='' as $$
declare v_project uuid;
begin
 if auth.uid() is null then return old;end if;
 if tg_table_name='document_folders' then v_project:=old.project_id;else select project_id into v_project from public.document_folders where id=old.folder_id;end if;
 perform public.trash_project_archive(v_project,case when tg_table_name='document_folders' then 'folder' else 'document' end,old.id,gen_random_uuid());
 return null;
end;$$;
revoke all on function app_private.recycle_legacy_archive_delete() from public,anon,authenticated;
create trigger recycle_legacy_archive_delete before delete on public.document_folders for each row execute function app_private.recycle_legacy_archive_delete();
create trigger recycle_legacy_archive_delete before delete on public.documents for each row execute function app_private.recycle_legacy_archive_delete();

create function app_private.protect_project_archive_delete() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and exists(select 1 from public.document_folders where project_id=old.id) then raise exception 'المشروع يحتوي أرشيفاً محفوظاً؛ حذفه نهائياً يحتاج مساراً مستقلاً لحماية الملفات' using errcode='42501';end if;
 return old;
end;$$;
revoke all on function app_private.protect_project_archive_delete() from public,anon,authenticated;
create trigger protect_project_archive_delete before delete on public.projects for each row execute function app_private.protect_project_archive_delete();

create function app_private.protect_referenced_document_object() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and old.bucket_id='documents' and app_private.storage_reference_exists('documents',old.name) then raise exception 'الملف مرتبط بأرشيف محفوظ؛ لا يمكن حذف محتواه مباشرة' using errcode='42501';end if;
 return old;
end;$$;
revoke all on function app_private.protect_referenced_document_object() from public,anon,authenticated;
create trigger protect_referenced_document_object before delete on storage.objects for each row execute function app_private.protect_referenced_document_object();

-- Reuse live folders only: trashed folders keep their identity until restored.
create or replace function public.ensure_document_folder(p_project_id uuid,p_parent_folder_id uuid,p_name text,p_id uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare found_ids uuid[];clean_name text:=btrim(p_name);
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or not coalesce(public.can_access_project(p_project_id),false) then raise exception 'لا تملك صلاحية الوصول إلى المشروع' using errcode='42501';end if;
 perform 1 from public.projects where id=p_project_id for share;
 if clean_name is null or clean_name in ('','.','..') or length(clean_name)>255 or clean_name ~ '[/\\[:cntrl:]]' then raise exception 'اسم المجلد غير صالح' using errcode='22023';end if;
 if p_parent_folder_id is not null and not exists(select 1 from public.document_folders where id=p_parent_folder_id and project_id=p_project_id and trashed_at is null) then raise exception 'المجلد الأب غير متاح ضمن المشروع' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_project_id::text||coalesce(p_parent_folder_id::text,'root')||clean_name,0));
 select array_agg(id order by id) into found_ids from public.document_folders where project_id=p_project_id and parent_folder_id is not distinct from p_parent_folder_id and name=clean_name and trashed_at is null;
 if cardinality(found_ids)>1 then raise exception 'يوجد أكثر من مجلد بهذا الاسم؛ أعد تسمية المجلدات المتكررة أولاً' using errcode='22023';end if;
 if cardinality(found_ids)=1 then return found_ids[1];end if;
 insert into public.document_folders(id,project_id,parent_folder_id,name) values(p_id,p_project_id,p_parent_folder_id,clean_name);return p_id;
end;$$;
