-- توسعة القيد المحتمل على activities.budget_type (من الإعداد الأولي قبل تتبع
-- migrations) ليشمل القيمة الجديدة "estimated" (ميزانية تقديرية) إلى جانب
-- lumpsum/boq الحاليتين. drop if exists يجعل هذا آمناً حتى لو كان اسم القيد
-- مختلفاً عمّا هو متوقع أو لم يكن موجوداً أصلاً.
do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.activities'::regclass
      and pg_get_constraintdef(oid) ilike '%budget_type%'
  loop
    execute format('alter table public.activities drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.activities
  add constraint activities_budget_type_check
  check (budget_type is null or budget_type in ('lumpsum', 'boq', 'estimated'));

notify pgrst, 'reload schema';
