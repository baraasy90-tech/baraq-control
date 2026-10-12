-- تخصيص اسم القسم ومسمّيات الأدوار (رئيس القسم/عضو) لكل قسم على حدة،
-- وتغيير الاسم الافتراضي لقسم "الإدارة التنفيذية" التلقائي إلى "مدير الحساب".

alter table public.departments add column head_label text;
alter table public.departments add column member_label text;

update public.departments
set name = 'مدير الحساب'
where type = 'executive' and name = 'الإدارة التنفيذية';

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
  insert into public.departments (company_id, name, type) values (new.id, 'مدير الحساب', 'executive')
    returning id into exec_dept_id;

  insert into public.department_members (department_id, user_id, role) values (pm_dept_id, new.created_by, 'head');
  insert into public.department_members (department_id, user_id, role) values (exec_dept_id, new.created_by, 'head');

  return new;
end;
$$;
