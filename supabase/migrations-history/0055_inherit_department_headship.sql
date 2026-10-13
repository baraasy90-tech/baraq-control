-- رئاسة القسم تُورَّث تلقائياً للأقسام الفرعية التي لا تملك رئيساً خاصاً بها: رئيس
-- قسم "إدارة المشاريع" مثلاً يُعتبر أيضاً مسؤولاً عن كل الأقسام المتفرّعة تحته
-- (مدير مشروع 01، مراقب...) طالما لم يُحدَّد لها رئيس مباشر خاص بها، بدل أن تبقى
-- تلك الأقسام الفرعية "بدون رئيس قسم" فعلياً رغم وجود تسلسل إداري واضح فوقها.
--
-- التطبيق العملي: can_manage_department (تتحكم بمن يقدر يدير أعضاء القسم ويدعو/
-- يرفض دعوات) تتحقق الآن أيضاً من رئاسة أي قسم أب بالسلسلة الهرمية، وليس فقط
-- رئاسة القسم نفسه مباشرة.

create or replace function public.can_manage_department(p_department_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_company_id uuid;
  v_current_id uuid;
begin
  select company_id into v_company_id from public.departments where id = p_department_id;
  if v_company_id is null then
    return false;
  end if;

  if public.can_manage_org(v_company_id) then
    return true;
  end if;

  v_current_id := p_department_id;
  while v_current_id is not null loop
    if exists (
      select 1 from public.department_members dm
      where dm.department_id = v_current_id and dm.user_id = auth.uid() and dm.role = 'head'
    ) then
      return true;
    end if;
    select parent_department_id into v_current_id from public.departments where id = v_current_id;
  end loop;

  return false;
end;
$$;
