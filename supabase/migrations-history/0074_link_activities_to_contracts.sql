-- ربط "المخطط" لبند الجدول الزمني بعقد كامل بدل الإدخال اليدوي الحر.
-- النشاط هو من "يختار" عقده (وليس العكس) لضمان عقد واحد كحد أقصى لكل نشاط
-- ومنع أي احتمال ازدواج حساب عند تجميع الشجرة الهرمية.

alter table public.activities
  add column linked_contract_id uuid references public.contracts (id) on delete set null;

create index activities_linked_contract_id_idx on public.activities (linked_contract_id);

-- تحقق تينانت/مشروع: العقد المرتبط يجب أن يكون لنفس مشروع النشاط
create or replace function public.validate_activity_contract_link()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.linked_contract_id is not null then
    if not exists (
      select 1 from public.contracts c
      where c.id = new.linked_contract_id and c.project_id = new.project_id
    ) then
      raise exception 'linked_contract_id must belong to the same project';
    end if;
  end if;
  return new;
end;
$$;

create trigger validate_activity_contract_link
  before insert or update of linked_contract_id, project_id on public.activities
  for each row execute function public.validate_activity_contract_link();

notify pgrst, 'reload schema';
