-- إضافة "المشتريات" كنوع قسم رسمي — كان يلزمه سابقاً استخدام "قسم مخصص" بدون
-- إمكانية ربطه ببقية المنظومة (الهبوط التلقائي، صلاحيات الاعتماد المخصصة).
alter table public.departments drop constraint departments_type_check;
alter table public.departments add constraint departments_type_check
  check (type in ('project_management', 'finance', 'hr', 'executive', 'procurement', 'custom'));
