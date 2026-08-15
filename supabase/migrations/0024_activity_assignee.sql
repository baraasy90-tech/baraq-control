-- إسناد بند الجدول الزمني لعضو فريق محدد — يُستخدم لربط بنود الجدول الزمني بقسم "المهام".
alter table public.activities add column assigned_to uuid references public.profiles (id) on delete set null;
create index activities_assigned_to_idx on public.activities (assigned_to);
