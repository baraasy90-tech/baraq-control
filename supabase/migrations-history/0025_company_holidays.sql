-- أعياد وطنية/مناسبات خاصة يُدخلها مدير الشركة يدوياً — بديل/تكميل للقوائم المحسوبة تلقائياً،
-- حتى لا يعتمد التطبيق وحده على دقة قائمة مُعدّة مسبقاً.
create table public.company_holidays (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  holiday_date date not null,
  recurring_yearly boolean not null default true,
  created_at timestamptz not null default now()
);

create index company_holidays_company_id_idx on public.company_holidays (company_id);

alter table public.company_holidays enable row level security;

create policy "company members read holidays" on public.company_holidays
  for select using (company_id = public.current_company_id());

create policy "org managers insert holidays" on public.company_holidays
  for insert with check (public.can_manage_org(company_id));

create policy "org managers update holidays" on public.company_holidays
  for update using (public.can_manage_org(company_id));

create policy "org managers delete holidays" on public.company_holidays
  for delete using (public.can_manage_org(company_id));
