-- Text is private project data. Original objects are never modified by indexing.
create function app_private.normalize_document_text(value text) returns text language sql immutable parallel safe set search_path='' as $$
select pg_catalog.lower(pg_catalog.translate(pg_catalog.regexp_replace(coalesce(value,''),'[ً-ٰٟـ]','','g'),'أإآٱى','ااااي'))
$$;
revoke all on function app_private.normalize_document_text(text) from public,anon,authenticated;
create table app_private.document_content (
 document_id uuid primary key references public.documents(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade,
 source_version integer not null, source_sha256 text not null check(source_sha256 ~ '^[0-9a-f]{64}$'),
 extractor text not null check(extractor in ('utf-text-v1','pdf-text-v1')),
 text_content text not null check(length(text_content) between 1 and 200000),
 search_vector tsvector generated always as (pg_catalog.to_tsvector('simple'::regconfig,app_private.normalize_document_text(text_content))) stored,
 indexed_at timestamptz not null default now(),indexed_by uuid not null
);
alter table app_private.document_content enable row level security;
revoke all on app_private.document_content from public,anon,authenticated;
create index document_content_project_idx on app_private.document_content(project_id);
create index document_content_search_idx on app_private.document_content using gin(search_vector);

create function public.set_document_content(p_document_id uuid,p_expected_version integer,p_text text,p_sha256 text,p_extractor text)
returns void language plpgsql security definer set search_path='' as $$
declare target record; project_company uuid; total_characters bigint;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'يلزم حساب مسجل دائم' using errcode='42501';end if;
 select d.row_version,d.trashed_at,f.project_id into target from public.documents d join public.document_folders f on f.id=d.folder_id where d.id=p_document_id;
 if not found or not coalesce(public.can_access_project(target.project_id),false) then raise exception 'المستند غير متاح ضمن صلاحياتك' using errcode='42501';end if;
 select company_id into project_company from public.projects where id=target.project_id for update;
 perform platform_private.assert_company_writable(project_company);
 perform 1 from public.documents d join public.document_folders f on f.id=d.folder_id where d.id=p_document_id and d.row_version=p_expected_version and d.trashed_at is null and f.trashed_at is null and f.project_id=target.project_id for update of d nowait;
 if not found then raise exception 'تغير المستند أو نُقل إلى السلة؛ حدّث الصفحة قبل الفهرسة' using errcode='40001';end if;
 if p_text is null then delete from app_private.document_content where document_id=p_document_id;return;end if;
 if length(btrim(p_text))=0 or length(p_text)>200000 or p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' or p_extractor is null or p_extractor not in ('utf-text-v1','pdf-text-v1') then raise exception 'النص أو بيانات الفهرسة غير صالحة أو تجاوزت الحد المتاح' using errcode='22023';end if;
 if pg_catalog.length(pg_catalog.to_tsvector('simple'::regconfig,app_private.normalize_document_text(p_text)))=0 then raise exception 'لم يُعثر على كلمات قابلة للفهرسة في النص' using errcode='22023';end if;
 select coalesce(sum(length(text_content)),0) into total_characters from app_private.document_content where project_id=target.project_id and document_id<>p_document_id;
 if total_characters+length(p_text)>10000000 then raise exception 'بلغ فهرس نصوص المشروع سعته الحالية؛ أزل فهارس غير مطلوبة قبل الإضافة' using errcode='54000';end if;
 insert into app_private.document_content(document_id,project_id,source_version,source_sha256,extractor,text_content,indexed_by)
 values(p_document_id,target.project_id,p_expected_version,p_sha256,p_extractor,p_text,auth.uid())
 on conflict(document_id) do update set project_id=excluded.project_id,source_version=excluded.source_version,source_sha256=excluded.source_sha256,extractor=excluded.extractor,text_content=excluded.text_content,indexed_at=now(),indexed_by=excluded.indexed_by
 where (document_content.project_id,document_content.source_version,document_content.source_sha256,document_content.extractor,document_content.text_content) is distinct from (excluded.project_id,excluded.source_version,excluded.source_sha256,excluded.extractor,excluded.text_content);
exception when lock_not_available or deadlock_detected then raise exception 'المستند قيد التعديل؛ أعد المحاولة بعد انتهاء العملية' using errcode='55P03';
end;$$;
revoke all on function public.set_document_content(uuid,integer,text,text,text) from public,anon;
grant execute on function public.set_document_content(uuid,integer,text,text,text) to authenticated;

create function public.search_document_content(p_project_id uuid,p_query text,p_after uuid default null)
returns table(document_id uuid,folder_id uuid,name text,file_url text,snippet text,row_version integer)
language plpgsql stable security definer set search_path='' as $$
declare search_query tsquery;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or not coalesce(public.can_access_project(p_project_id),false) then raise exception 'لا تملك صلاحية البحث في المشروع' using errcode='42501';end if;
 if p_query is null or length(btrim(p_query))<2 or length(p_query)>200 then raise exception 'أدخل عبارة بحث بين حرفين و200 حرف' using errcode='22023';end if;
 search_query:=pg_catalog.plainto_tsquery('simple'::regconfig,app_private.normalize_document_text(p_query));
 return query select d.id,d.folder_id,d.name,d.file_url,
 pg_catalog.ts_headline('simple'::regconfig,app_private.normalize_document_text(i.text_content),search_query,'StartSel=⟦,StopSel=⟧,MaxWords=35,MinWords=12,MaxFragments=2'),d.row_version
 from app_private.document_content i join public.documents d on d.id=i.document_id join public.document_folders f on f.id=d.folder_id
 where i.project_id=p_project_id and f.project_id=p_project_id and d.trashed_at is null and f.trashed_at is null and i.source_version=d.row_version
 and i.search_vector @@ search_query and (p_after is null or d.id>p_after) order by d.id limit 31;
end;$$;
revoke all on function public.search_document_content(uuid,text,uuid) from public,anon;
grant execute on function public.search_document_content(uuid,text,uuid) to authenticated;
