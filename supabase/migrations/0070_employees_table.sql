-- Phase 3 من مشروع تطوير الهيكل التنظيمي: الفجوة الكبرى المحدَّدة بتقرير التحليل —
-- "موظف" مستقل تماماً عن حساب مستخدم فعلي. جدول جديد بالكامل، إضافي فوق department_members
-- (لا يستبدله ولا يغيّر سلوكه الحالي إطلاقاً)، مع جسر employee_id اختياري بينهما.
--
-- المبدأ: department_members يبقى مصدر "من عضو بأي قسم فعلياً + دوره" كما هو تماماً.
-- employees يصبح تدريجياً مصدر "من هو الموظف فعلياً" (بما فيهم من لم يُدعَ بعد)، مع سلسلة
-- مدير مباشر شخصية (direct_manager_employee_id) منفصلة تماماً عن رئاسة القسم البنيوية —
-- بالضبط توصية التقرير: لا نُنشئ "unit_manager" منفصلاً، department_members.role='head'
-- يبقى المصدر الوحيد لذلك.

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  department_id uuid references public.departments (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  user_id uuid references auth.users (id) on delete set null,
  organizational_level_id uuid references public.organizational_levels (id) on delete set null,
  organizational_classification_id uuid references public.organizational_classifications (id) on delete set null,
  job_title_id uuid references public.job_titles (id) on delete set null,
  direct_manager_employee_id uuid references public.employees (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'invited', 'pending', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index employees_company_id_idx on public.employees (company_id);
create index employees_department_id_idx on public.employees (department_id);
create index employees_user_id_idx on public.employees (user_id);
create index employees_direct_manager_employee_id_idx on public.employees (direct_manager_employee_id);
create index employees_organizational_level_id_idx on public.employees (organizational_level_id);

alter table public.department_members add column employee_id uuid references public.employees (id) on delete set null;
create index department_members_employee_id_idx on public.department_members (employee_id);

alter table public.employees enable row level security;

create policy "company members read employees" on public.employees
  for select using (company_id = public.current_company_id());
create policy "org managers insert employees" on public.employees
  for insert with check (public.can_manage_org(company_id));
create policy "org managers update employees" on public.employees
  for update using (public.can_manage_org(company_id));
create policy "org managers delete employees" on public.employees
  for delete using (public.can_manage_org(company_id));

-- ===== تحقق عزل المستأجرين: كل مرجع (قسم/مستوى/تصنيف/مسمّى/مدير مباشر) يجب أن يتبع
-- لنفس شركة الموظف نفسه =====
create or replace function public.validate_employee_references()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.department_id is not null and not exists (
    select 1 from public.departments where id = new.department_id and company_id = new.company_id
  ) then
    raise exception 'القسم المختار لا يتبع لنفس شركة الموظف';
  end if;

  if new.organizational_level_id is not null and not exists (
    select 1 from public.organizational_levels where id = new.organizational_level_id and company_id = new.company_id
  ) then
    raise exception 'المستوى الإداري المختار لا يتبع لنفس شركة الموظف';
  end if;

  if new.organizational_classification_id is not null and not exists (
    select 1 from public.organizational_classifications where id = new.organizational_classification_id and company_id = new.company_id
  ) then
    raise exception 'التصنيف المختار لا يتبع لنفس شركة الموظف';
  end if;

  if new.job_title_id is not null and not exists (
    select 1 from public.job_titles where id = new.job_title_id and company_id = new.company_id
  ) then
    raise exception 'المسمّى الوظيفي المختار لا يتبع لنفس شركة الموظف';
  end if;

  if new.direct_manager_employee_id is not null and not exists (
    select 1 from public.employees where id = new.direct_manager_employee_id and company_id = new.company_id
  ) then
    raise exception 'المدير المباشر المختار لا يتبع لنفس شركة الموظف';
  end if;

  return new;
end;
$$;

drop trigger if exists employees_validate_references on public.employees;
create trigger employees_validate_references
  before insert or update on public.employees
  for each row execute function public.validate_employee_references();

-- ===== منع الدائرية بسلسلة المدير المباشر (نفس نمط 0067 تماماً لكن على employees) =====
create or replace function public.prevent_employee_manager_circular_chain()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_current uuid;
  v_hops int := 0;
begin
  if new.direct_manager_employee_id is null then
    return new;
  end if;

  if new.direct_manager_employee_id = new.id then
    raise exception 'لا يمكن أن يكون الموظف مديره المباشر بنفسه';
  end if;

  v_current := new.direct_manager_employee_id;
  while v_current is not null and v_hops < 1000 loop
    if v_current = new.id then
      raise exception 'لا يمكن تعيين هذا الشخص كمدير مباشر لأنه يُنشئ حلقة إدارية دائرية';
    end if;
    select direct_manager_employee_id into v_current from public.employees where id = v_current;
    v_hops := v_hops + 1;
  end loop;

  return new;
end;
$$;

drop trigger if exists employees_prevent_manager_circular_chain on public.employees;
create trigger employees_prevent_manager_circular_chain
  before insert or update of direct_manager_employee_id on public.employees
  for each row execute function public.prevent_employee_manager_circular_chain();

-- ===== سجل تدقيق (نفس نمط early-return من 0061/0066) =====
create or replace function public.audit_employees()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.audit_log (company_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    coalesce(new.company_id, old.company_id), 'employees', coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists employees_audit on public.employees;
create trigger employees_audit after insert or update or delete on public.employees
  for each row execute function public.audit_employees();

-- ===== تحديث updated_at تلقائياً =====
create or replace function public.touch_employee_updated_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists employees_touch_updated_at on public.employees;
create trigger employees_touch_updated_at before update on public.employees
  for each row execute function public.touch_employee_updated_at();

-- ===== تعبئة أولية: صف employees واحد لكل شخص موجود فعلياً بـ department_members
-- (وليس صف لكل عضوية قسم — لو كان الشخص عضواً بعدة أقسام، نأخذ القسم الذي هو رئيسه
-- فيه إن وُجد، وإلا أقدم عضوية له) =====
insert into public.employees (company_id, department_id, full_name, email, user_id, organizational_level_id, organizational_classification_id, job_title_id, status, created_at)
select distinct on (d.company_id, dm.user_id)
  d.company_id, dm.department_id, coalesce(p.full_name, 'بدون اسم'), u.email, dm.user_id,
  dm.organizational_level_id, dm.organizational_classification_id, dm.job_title_id,
  'active', dm.created_at
from public.department_members dm
join public.departments d on d.id = dm.department_id
join public.profiles p on p.id = dm.user_id
join auth.users u on u.id = dm.user_id
order by d.company_id, dm.user_id, (dm.role = 'head') desc, dm.created_at asc;

update public.department_members dm
set employee_id = e.id
from public.employees e
join public.departments d on d.id = dm.department_id
where e.user_id = dm.user_id and e.company_id = d.company_id and dm.employee_id is null;

-- ===== من الآن فصاعداً: أي عضوية قسم جديدة تُنشئ (أو تربط) سجل employees تلقائياً —
-- تعمل مع أي مسار إنشاء (accept_invite، join_company_by_code، أو أي إدراج مباشر آخر)
-- بلا حاجة لتعديل تلك الدوال إطلاقاً. كما تربط تلقائياً بأي "موظف قبل الدعوة" (بلا
-- حساب) موجود مسبقاً بنفس البريد، بدل إنشاء صف مكرر. =====
create or replace function public.sync_employee_from_department_member()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
  v_employee_id uuid;
  v_full_name text;
  v_email text;
begin
  select company_id into v_company_id from public.departments where id = new.department_id;
  select full_name into v_full_name from public.profiles where id = new.user_id;
  select email into v_email from auth.users where id = new.user_id;

  select id into v_employee_id from public.employees where user_id = new.user_id and company_id = v_company_id;

  if v_employee_id is null and v_email is not null then
    select id into v_employee_id from public.employees
    where company_id = v_company_id and user_id is null and lower(email) = lower(v_email)
    limit 1;
    if v_employee_id is not null then
      update public.employees set user_id = new.user_id, status = 'active' where id = v_employee_id;
    end if;
  end if;

  if v_employee_id is null then
    insert into public.employees (company_id, department_id, full_name, email, user_id, status)
    values (v_company_id, new.department_id, coalesce(v_full_name, 'بدون اسم'), v_email, new.user_id, 'active')
    returning id into v_employee_id;
  end if;

  new.employee_id := v_employee_id;
  return new;
end;
$$;

drop trigger if exists department_members_sync_employee on public.department_members;
create trigger department_members_sync_employee
  before insert on public.department_members
  for each row execute function public.sync_employee_from_department_member();

-- ===== توسيع تحقق عزل المستأجرين الموجود بالفعل على department_members ليشمل employee_id =====
create or replace function public.validate_department_member_taxonomy()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select company_id into v_company_id from public.departments where id = new.department_id;

  if new.organizational_level_id is not null and not exists (
    select 1 from public.organizational_levels where id = new.organizational_level_id and company_id = v_company_id
  ) then
    raise exception 'المستوى الإداري المختار لا يتبع لنفس الشركة';
  end if;

  if new.organizational_classification_id is not null and not exists (
    select 1 from public.organizational_classifications where id = new.organizational_classification_id and company_id = v_company_id
  ) then
    raise exception 'التصنيف المختار لا يتبع لنفس الشركة';
  end if;

  if new.job_title_id is not null and not exists (
    select 1 from public.job_titles where id = new.job_title_id and company_id = v_company_id
  ) then
    raise exception 'المسمّى الوظيفي المختار لا يتبع لنفس الشركة';
  end if;

  if new.employee_id is not null and not exists (
    select 1 from public.employees where id = new.employee_id and company_id = v_company_id
  ) then
    raise exception 'سجل الموظف المرتبط لا يتبع لنفس الشركة';
  end if;

  return new;
end;
$$;

drop trigger if exists department_members_validate_taxonomy on public.department_members;
create trigger department_members_validate_taxonomy
  before insert or update of organizational_level_id, organizational_classification_id, job_title_id, employee_id, department_id
  on public.department_members
  for each row execute function public.validate_department_member_taxonomy();
