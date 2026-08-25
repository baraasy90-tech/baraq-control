-- Phase 2 من مشروع تطوير الهيكل التنظيمي: ربط الأعمدة التصنيفية الثلاثة (Phase 1) بعضوية
-- الأقسام الفعلية. كل الأعمدة nullable ولا تُغيّر أي سلوك حالي — عضو بلا أي تصنيف يبقى
-- يعمل بالضبط كما اليوم. trigger تحقق بسيط يمنع اختيار مستوى/تصنيف/مسمّى من شركة مختلفة
-- (نفس مبدأ عزل المستأجرين المتبع في بقية النظام).

alter table public.department_members
  add column organizational_level_id uuid references public.organizational_levels (id) on delete set null,
  add column organizational_classification_id uuid references public.organizational_classifications (id) on delete set null,
  add column job_title_id uuid references public.job_titles (id) on delete set null;

create index department_members_organizational_level_id_idx on public.department_members (organizational_level_id);
create index department_members_organizational_classification_id_idx on public.department_members (organizational_classification_id);
create index department_members_job_title_id_idx on public.department_members (job_title_id);

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

  return new;
end;
$$;

drop trigger if exists department_members_validate_taxonomy on public.department_members;
create trigger department_members_validate_taxonomy
  before insert or update of organizational_level_id, organizational_classification_id, job_title_id, department_id
  on public.department_members
  for each row execute function public.validate_department_member_taxonomy();
