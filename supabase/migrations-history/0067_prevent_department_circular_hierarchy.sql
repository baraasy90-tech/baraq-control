-- Phase 0 من مشروع تطوير الهيكل التنظيمي: لا يوجد حالياً أي تحقق من الدائرية الهرمية
-- (Circular Hierarchy) على مستوى قاعدة البيانات — الحماية الوحيدة اليوم أمامية فقط
-- (ومكرّرة بعدة نسخ). أي طلب مباشر لـ Supabase REST API (متجاوزاً الواجهة) يستطيع
-- جعل قسم "أباً" لأحد أجداده، فيُنشئ حلقة لا نهائية بالشجرة. هذا trigger يمنع ذلك
-- فعلياً بغض النظر عن مصدر الطلب.

create or replace function public.prevent_department_circular_hierarchy()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_current uuid;
  v_hops int := 0;
begin
  if new.parent_department_id is null then
    return new;
  end if;

  if new.parent_department_id = new.id then
    raise exception 'لا يمكن أن يكون القسم أباً لنفسه';
  end if;

  v_current := new.parent_department_id;
  while v_current is not null and v_hops < 1000 loop
    if v_current = new.id then
      raise exception 'لا يمكن نقل القسم ليصبح تابعاً لأحد أقسامه الفرعية';
    end if;
    select parent_department_id into v_current from public.departments where id = v_current;
    v_hops := v_hops + 1;
  end loop;

  return new;
end;
$$;

drop trigger if exists departments_prevent_circular_hierarchy on public.departments;
create trigger departments_prevent_circular_hierarchy
  before insert or update of parent_department_id on public.departments
  for each row execute function public.prevent_department_circular_hierarchy();
