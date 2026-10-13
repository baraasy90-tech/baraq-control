create role anon; create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table profiles(id uuid primary key);
create table companies(id uuid primary key,is_individual boolean default false,created_by uuid);
create table projects(id uuid primary key,company_id uuid references companies);
create table actor_access(user_id uuid,project_id uuid,role text);
create function can_access_project(p_project_id uuid) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.actor_access where user_id=auth.uid() and project_id=p_project_id) $$;
create function can_pm_approve(p_project_id uuid) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.actor_access where user_id=auth.uid() and project_id=p_project_id and role='pm') $$;
create function can_finance_approve(p_project_id uuid) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.actor_access where user_id=auth.uid() and project_id=p_project_id and role='finance') $$;
create table activities(id uuid primary key,project_id uuid references projects,actual_end_date date);
create table contracts(id uuid primary key,project_id uuid references projects,status text not null default 'draft',settlement_status text not null default 'open',submitted_by uuid,pm_reviewed_by uuid);
create table budget_actual_entries(id uuid primary key default gen_random_uuid(),activity_id uuid not null references activities,amount numeric,date date,source text,note text,contract_ref text,contract_payment_id uuid);
create table contract_payments(id uuid primary key default gen_random_uuid(),contract_id uuid not null references contracts,amount numeric,percentage numeric,status text not null default 'pending',
submitted_by uuid,submitted_at timestamptz,pm_reviewed_by uuid,pm_reviewed_at timestamptz,pm_review_note text,finance_reviewed_by uuid,finance_reviewed_at timestamptz,finance_review_note text);
create table contract_extra_works(id uuid primary key default gen_random_uuid(),contract_id uuid references contracts,amount numeric,status text not null default 'draft',pm_reviewed_by uuid);
create table material_requests(id uuid primary key default gen_random_uuid(),project_id uuid references projects,status text not null default 'draft',sample_submitted_by uuid);
create table checklist_items(id uuid primary key,activity_id uuid references activities,photo_required boolean default false);
create table submissions(id uuid primary key default gen_random_uuid(),activity_id uuid not null references activities,manager_name text not null default '',manager_signature_url text,decision text not null check(decision in ('approved','approvedWithNotes','rejected')),notes text,created_at timestamptz not null default now());
create table checklist_results(id uuid primary key default gen_random_uuid(),submission_id uuid not null references submissions on delete cascade,checklist_item_id uuid references checklist_items,checked boolean not null default false,image_url text);
create table submission_images(id uuid primary key default gen_random_uuid(),submission_id uuid not null references submissions on delete cascade,image_url text not null check(image_url <> 'FAIL'));
grant usage on schema public,auth to authenticated,anon;
grant select,insert,update,delete on all tables in schema public to authenticated,anon;
insert into profiles select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,4) n;
insert into companies values('00000000-0000-0000-0000-000000000101',false,'00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000102',true,'00000000-0000-0000-0000-000000000004');
insert into projects values('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000101'),('00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000102');
insert into activities values('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000201',null),('00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000202',null);
insert into contracts(id,project_id) values('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000201'),('00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000202');
insert into actor_access values('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000201','member'),('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000201','pm'),('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000201','finance'),('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000202','member'),('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000202','member');
insert into checklist_items values('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000301',true),('00000000-0000-0000-0000-000000000502','00000000-0000-0000-0000-000000000302',false);
alter table activities enable row level security;
create policy scope on activities for all using(can_access_project(project_id)) with check(can_access_project(project_id));
alter table contracts enable row level security;
create policy scope on contracts for all using(can_access_project(project_id)) with check(can_access_project(project_id));
alter table budget_actual_entries enable row level security;
alter table contract_payments enable row level security;
create policy scope on contract_payments for all using(contract_id in(select id from contracts where can_access_project(project_id))) with check(contract_id in(select id from contracts where can_access_project(project_id)));
alter table checklist_items enable row level security;
create policy scope on checklist_items for all using(activity_id in(select id from activities where can_access_project(project_id)));
alter table submissions enable row level security;
create policy scope on submissions for all using(activity_id in(select id from activities where can_access_project(project_id))) with check(activity_id in(select id from activities where can_access_project(project_id)));
alter table checklist_results enable row level security;
create policy scope on checklist_results for all using(submission_id in(select id from submissions)) with check(submission_id in(select id from submissions));
alter table submission_images enable row level security;
create policy scope on submission_images for all using(submission_id in(select id from submissions)) with check(submission_id in(select id from submissions));
