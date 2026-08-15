-- ============================================================
-- المرحلة 1: حسابات حقيقية + أدوار وصلاحيات + هيكل الأقسام
-- شغّل هذا الملف كاملاً في Supabase SQL Editor بعد المايجريشنز السابقة
-- ============================================================

-- ---------- الأقسام ----------
-- كل شركة تبدأ بقسمين تلقائياً: "إدارة المشاريع" (المُفعّل حالياً) و"الإدارة التنفيذية"
-- (رؤية شاملة عبر كل الأقسام). أقسام لاحقة (مالية/موارد بشرية) تُضاف لاحقاً بنفس النمط.
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  type text not null default 'custom' check (type in ('project_management', 'finance', 'hr', 'executive', 'custom')),
  created_at timestamptz not null default now()
);

create index departments_company_id_idx on public.departments (company_id);

-- ---------- عضوية الأقسام ----------
-- role: 'member' موظف عادي داخل القسم، 'head' رئيس القسم
create table public.department_members (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'head')),
  created_at timestamptz not null default now(),
  unique (department_id, user_id)
);

create index department_members_department_id_idx on public.department_members (department_id);
create index department_members_user_id_idx on public.department_members (user_id);

-- ---------- دعوات الانضمام ----------
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  department_id uuid not null references public.departments (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'head')),
  email text not null,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  invited_by uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days')
);

create index invites_company_id_idx on public.invites (company_id);

-- ---------- ربط المشاريع بالقسم المالك (يمهّد لأقسام مستقبلية تملك بيانات خاصة بها) ----------
alter table public.projects add column department_id uuid references public.departments (id) on delete set null;

-- ============================================================
-- دوال مساعدة: صلاحيات المؤسسة
-- ============================================================
create or replace function public.is_company_owner(p_company_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from public.companies where id = p_company_id and created_by = auth.uid());
$$;

create or replace function public.is_executive(p_company_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.department_members dm
    join public.departments d on d.id = dm.department_id
    where dm.user_id = auth.uid() and d.company_id = p_company_id and d.type = 'executive'
  );
$$;

-- مالك الشركة أو أي عضو بالإدارة التنفيذية يقدر يدير الأقسام/العضوية/الدعوات
create or replace function public.can_manage_org(p_company_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.is_company_owner(p_company_id) or public.is_executive(p_company_id);
$$;

-- ============================================================
-- إنشاء تلقائي لقسمي "إدارة المشاريع" و"الإدارة التنفيذية" عند إنشاء شركة جديدة
-- ============================================================
create or replace function public.handle_new_company()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  pm_dept_id uuid;
  exec_dept_id uuid;
begin
  insert into public.departments (company_id, name, type) values (new.id, 'إدارة المشاريع', 'project_management')
    returning id into pm_dept_id;
  insert into public.departments (company_id, name, type) values (new.id, 'الإدارة التنفيذية', 'executive')
    returning id into exec_dept_id;

  insert into public.department_members (department_id, user_id, role) values (pm_dept_id, new.created_by, 'head');
  insert into public.department_members (department_id, user_id, role) values (exec_dept_id, new.created_by, 'head');

  return new;
end;
$$;

create trigger on_company_created
  after insert on public.companies
  for each row execute procedure public.handle_new_company();

-- ============================================================
-- تعيين تلقائي لقسم "إدارة المشاريع" لأي مشروع جديد ما حُدِّد له قسم صراحةً
-- ============================================================
create or replace function public.handle_new_project()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.department_id is null then
    select id into new.department_id
    from public.departments
    where company_id = new.company_id and type = 'project_management'
    limit 1;
  end if;
  return new;
end;
$$;

create trigger on_project_created
  before insert on public.projects
  for each row execute procedure public.handle_new_project();

-- ============================================================
-- تفعيل RLS
-- ============================================================
alter table public.departments enable row level security;
alter table public.department_members enable row level security;
alter table public.invites enable row level security;

-- توسيع سياسة profiles: عضو الشركة يقدر يشوف اسم زملائه (لعرض قائمة الفريق)، لا يعدّل غير ملفه
create policy "company members read teammate profiles" on public.profiles
  for select using (company_id = public.current_company_id());

create policy "company members read departments" on public.departments
  for select using (company_id = public.current_company_id());
create policy "org managers insert departments" on public.departments
  for insert with check (public.can_manage_org(company_id));
create policy "org managers update departments" on public.departments
  for update using (public.can_manage_org(company_id));
create policy "org managers delete departments" on public.departments
  for delete using (public.can_manage_org(company_id));

create policy "company members read department_members" on public.department_members
  for select using (
    department_id in (select id from public.departments where company_id = public.current_company_id())
  );
create policy "org managers manage department_members" on public.department_members
  for all using (
    department_id in (select id from public.departments d where public.can_manage_org(d.company_id))
  )
  with check (
    department_id in (select id from public.departments d where public.can_manage_org(d.company_id))
  );

create policy "company members read invites" on public.invites
  for select using (company_id = public.current_company_id());
create policy "org managers insert invites" on public.invites
  for insert with check (public.can_manage_org(company_id));
create policy "org managers update invites" on public.invites
  for update using (public.can_manage_org(company_id));
create policy "org managers delete invites" on public.invites
  for delete using (public.can_manage_org(company_id));

-- ============================================================
-- قبول الدعوة (يُستدعى من التطبيق بعد إنشاء المستخدم لحسابه مباشرة)
-- security definer لأن المستخدم الجديد لسه ما عنده company_id فتفشل سياسات RLS العادية
-- ============================================================
create or replace function public.accept_invite(p_token text)
returns table (company_id uuid, company_name text, department_id uuid, role text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_invite record;
begin
  select * into v_invite from public.invites where token = p_token and status = 'pending' and expires_at > now();
  if not found then
    raise exception 'رابط الدعوة غير صالح أو منتهي الصلاحية';
  end if;

  if lower(v_invite.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'هذه الدعوة مرسلة لبريد إلكتروني مختلف عن حسابك الحالي';
  end if;

  update public.profiles set company_id = v_invite.company_id where id = auth.uid();

  insert into public.department_members (department_id, user_id, role)
  values (v_invite.department_id, auth.uid(), v_invite.role)
  on conflict (department_id, user_id) do update set role = excluded.role;

  update public.invites set status = 'accepted' where id = v_invite.id;

  return query select c.id, c.name, v_invite.department_id, v_invite.role from public.companies c where c.id = v_invite.company_id;
end;
$$;

grant execute on function public.accept_invite(text) to authenticated;

-- ============================================================
-- ترحيل الشركات الموجودة مسبقاً (قبل هذا المايجريشن): إنشاء الأقسام وربط المشاريع
-- ============================================================
do $$
declare
  c record;
  pm_dept_id uuid;
  exec_dept_id uuid;
begin
  for c in select id, created_by from public.companies loop
    select id into pm_dept_id from public.departments where company_id = c.id and type = 'project_management' limit 1;
    if pm_dept_id is null then
      insert into public.departments (company_id, name, type) values (c.id, 'إدارة المشاريع', 'project_management')
        returning id into pm_dept_id;
    end if;

    select id into exec_dept_id from public.departments where company_id = c.id and type = 'executive' limit 1;
    if exec_dept_id is null then
      insert into public.departments (company_id, name, type) values (c.id, 'الإدارة التنفيذية', 'executive')
        returning id into exec_dept_id;
    end if;

    insert into public.department_members (department_id, user_id, role)
    values (pm_dept_id, c.created_by, 'head')
    on conflict (department_id, user_id) do nothing;

    insert into public.department_members (department_id, user_id, role)
    values (exec_dept_id, c.created_by, 'head')
    on conflict (department_id, user_id) do nothing;

    update public.projects set department_id = pm_dept_id where company_id = c.id and department_id is null;
  end loop;
end $$;
