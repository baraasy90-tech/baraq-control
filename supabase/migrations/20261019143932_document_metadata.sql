-- Optional document metadata; existing RLS and subscription guards remain in force.
alter table public.documents
 add column category text check(category is null or category in ('drawing','contract','report','correspondence','approval','schedule','invoice','other')),
 add column reference_number text check(reference_number is null or char_length(reference_number)<=120),
 add column document_date date check(document_date is null or document_date between date '0001-01-01' and date '9999-12-31'),
 add column description text check(description is null or char_length(description)<=2000),
 add column row_version integer not null default 0 check(row_version>=0);

create function public.advance_document_version() returns trigger
language plpgsql security invoker set search_path='' as $$
begin new.row_version:=old.row_version+1;return new;end;$$;
revoke all on function public.advance_document_version() from public,anon,authenticated;
create trigger advance_document_version before update on public.documents
 for each row execute function public.advance_document_version();
