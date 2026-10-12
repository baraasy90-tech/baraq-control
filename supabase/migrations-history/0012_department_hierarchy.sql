-- إمكانية جعل أي قسم "تابعاً" لقسم أعلى منه، لبناء تدرّج هرمي (قسم تحت قسم) بدل قائمة مسطّحة.

alter table public.departments
  add column parent_department_id uuid references public.departments (id) on delete set null;

create index departments_parent_department_id_idx on public.departments (parent_department_id);
