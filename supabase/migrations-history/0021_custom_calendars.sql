-- تقويم عمل مخصص لكل شركة (مثلاً 3 أيام عمل بالأسبوع، أو أي نمط آخر)، يُختار
-- لأي بند بشكل اختياري ويتجاوز نوع التقويم الافتراضي (عادي/أيام عمل) عند تحديده.

create table public.custom_calendars (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  working_weekdays integer[] not null,
  created_at timestamptz not null default now()
);

create index custom_calendars_company_id_idx on public.custom_calendars (company_id);

alter table public.activities
  add column custom_calendar_id uuid references public.custom_calendars (id) on delete set null;

alter table public.custom_calendars enable row level security;

create policy "company members read custom_calendars" on public.custom_calendars
  for select using (company_id = public.current_company_id());
create policy "company members manage custom_calendars" on public.custom_calendars
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
