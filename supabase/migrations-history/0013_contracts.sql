-- ============================================================
-- المرحلة 1 من وحدة "العقود": عقد لكل مشروع (نسخة PDF + مدة + سياسة دفعات +
-- كميات/أسعار وحدة اختيارية + جدول دفعات + ضمان دفعة مقدمة + ضمان أعمال +
-- خصومات مخالفات المقاول). لا يشمل بعد ربط الميزانية والتنبيهات التلقائية
-- (مرحلة قادمة منفصلة).
-- ============================================================

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  pdf_url text,
  start_date date,
  duration_days integer,
  total_value numeric,
  payment_terms text,
  has_advance_payment boolean not null default false,
  advance_payment_percentage numeric,
  advance_payment_guarantee_note text,
  advance_deduction_percentage numeric default 10,
  retention_percentage numeric,
  retention_released boolean not null default false,
  retention_release_note text,
  created_at timestamptz not null default now()
);

create index contracts_project_id_idx on public.contracts (project_id);

-- بنود كميات/سعر وحدة اختيارية على مستوى العقد (منفصلة عن BOQ التفصيلي لكل مرحلة)
create table public.contract_line_items (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  description text not null,
  quantity numeric,
  unit text,
  unit_price numeric,
  "order" integer not null default 0
);

create index contract_line_items_contract_id_idx on public.contract_line_items (contract_id);

-- جدول الدفعات المتفق عليه
create table public.contract_payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  title text not null,
  due_date date,
  amount numeric,
  percentage numeric,
  paid boolean not null default false,
  guarantee_note text,
  "order" integer not null default 0
);

create index contract_payments_contract_id_idx on public.contract_payments (contract_id);

-- خصومات على المقاول بسبب مخالفات
create table public.contract_deductions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  violation_name text not null,
  deduction_amount numeric not null,
  damage_description text,
  deducted_at date not null default current_date,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index contract_deductions_contract_id_idx on public.contract_deductions (contract_id);

alter table public.contracts enable row level security;
alter table public.contract_line_items enable row level security;
alter table public.contract_payments enable row level security;
alter table public.contract_deductions enable row level security;

create policy "scoped access contracts" on public.contracts
  for all using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

create policy "scoped access contract_line_items" on public.contract_line_items
  for all using (
    contract_id in (select c.id from public.contracts c where public.can_access_project(c.project_id))
  )
  with check (
    contract_id in (select c.id from public.contracts c where public.can_access_project(c.project_id))
  );

create policy "scoped access contract_payments" on public.contract_payments
  for all using (
    contract_id in (select c.id from public.contracts c where public.can_access_project(c.project_id))
  )
  with check (
    contract_id in (select c.id from public.contracts c where public.can_access_project(c.project_id))
  );

create policy "scoped access contract_deductions" on public.contract_deductions
  for all using (
    contract_id in (select c.id from public.contracts c where public.can_access_project(c.project_id))
  )
  with check (
    contract_id in (select c.id from public.contracts c where public.can_access_project(c.project_id))
  );
