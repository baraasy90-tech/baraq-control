-- Phase 1 من مشروع تطوير الهيكل التنظيمي: ثلاثة جداول تصنيفية مستقلة تماماً عن أي
-- شيء موجود، غير مربوطة بعد بـ department_members (يأتي لاحقاً بمرحلة منفصلة كي لا
-- تُكسر أي شاشة حالية). نفس نمط RLS المستخدم أصلاً لـ departments بالضبط.
--
-- تنبيه معماري (من تقرير التحليل): "الإدارة" يجب ألا تُستنتج أبداً من نص المسمى
-- الوظيفي (job_titles.name) — المصدر الوحيد لتحديد "هل هذا مدير" يبقى
-- organizational_levels.is_management_level أو department_members.role='head'،
-- تماماً كما هو الحال اليوم (لا تغيير على هذا المبدأ).

create table public.organizational_levels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  order_index integer not null default 0,
  is_management_level boolean not null default false,
  is_employee_level boolean not null default false,
  is_worker_level boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.organizational_classifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.job_titles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index organizational_levels_company_id_idx on public.organizational_levels (company_id);
create index organizational_classifications_company_id_idx on public.organizational_classifications (company_id);
create index job_titles_company_id_idx on public.job_titles (company_id);

alter table public.organizational_levels enable row level security;
alter table public.organizational_classifications enable row level security;
alter table public.job_titles enable row level security;

create policy "company members read organizational_levels" on public.organizational_levels
  for select using (company_id = public.current_company_id());
create policy "org managers insert organizational_levels" on public.organizational_levels
  for insert with check (public.can_manage_org(company_id));
create policy "org managers update organizational_levels" on public.organizational_levels
  for update using (public.can_manage_org(company_id));
create policy "org managers delete organizational_levels" on public.organizational_levels
  for delete using (public.can_manage_org(company_id));

create policy "company members read organizational_classifications" on public.organizational_classifications
  for select using (company_id = public.current_company_id());
create policy "org managers insert organizational_classifications" on public.organizational_classifications
  for insert with check (public.can_manage_org(company_id));
create policy "org managers update organizational_classifications" on public.organizational_classifications
  for update using (public.can_manage_org(company_id));
create policy "org managers delete organizational_classifications" on public.organizational_classifications
  for delete using (public.can_manage_org(company_id));

create policy "company members read job_titles" on public.job_titles
  for select using (company_id = public.current_company_id());
create policy "org managers insert job_titles" on public.job_titles
  for insert with check (public.can_manage_org(company_id));
create policy "org managers update job_titles" on public.job_titles
  for update using (public.can_manage_org(company_id));
create policy "org managers delete job_titles" on public.job_titles
  for delete using (public.can_manage_org(company_id));
