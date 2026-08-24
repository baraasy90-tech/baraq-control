-- حساب فردي: شخص بلا شركة يقدر يشترك ويستخدم المنصة لمشاريعه الخاصة مباشرة، بنفس
-- كل الميزات تماماً (لأن كل مستخدم أصلاً يعمل ضمن "شركة" بالنموذج الحالي) — الفرق
-- الوحيد أن الشركة تُنشأ تلقائياً بإعدادات افتراضية بدل معالج الإعداد اليدوي (اسم/
-- شعار/أرشفة)، ويُعلَّم الحساب بعلم is_individual للتمييز بلوحة إدارة المنصة لاحقاً.
-- لو أراد أحدهم لاحقاً دعوة زملاء له، يبقى ذلك ممكناً بلا أي تغيير — يتحول عضوياً
-- لشركة حقيقية بمرور الوقت.

alter table public.companies add column is_individual boolean not null default false;

create or replace function public.create_individual_account(p_full_name text)
returns public.companies
language plpgsql
security definer set search_path = public
as $$
declare
  v_company public.companies;
begin
  if auth.uid() is null then
    raise exception 'يلزم تسجيل الدخول';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and company_id is not null) then
    raise exception 'لديك حساب بالفعل';
  end if;

  insert into public.companies (name, is_individual, archive_folder_name, archive_storage_type)
  values (
    'مساحة ' || coalesce(nullif(trim(p_full_name), ''), 'شخصية') || ' الخاصة',
    true, 'أرشيفي', 'cloud'
  )
  returning * into v_company;

  update public.profiles set company_id = v_company.id where id = auth.uid();

  return v_company;
end;
$$;

grant execute on function public.create_individual_account(text) to authenticated;
