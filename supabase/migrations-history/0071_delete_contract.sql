-- إضافة خيار حذف عقد — لم يكن موجوداً إطلاقاً بالواجهة رغم أن سياسة RLS العامة
-- ("scoped access contracts" — for all) كانت أصلاً تسمح تقنياً بالحذف لأي عضو بالمشروع.
-- نضيف RPC مخصصاً بدل الاعتماد على تلك السياسة الواسعة، ونقيّد الحذف بالعقود التي لم
-- تُعتمد بعد أو رُفضت — لمنع حذف عقد معتمد له التزامات مالية فعلية بالخطأ.

create or replace function public.delete_contract(p_contract_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
begin
  select project_id, status into v_project_id, v_status from public.contracts where id = p_contract_id;

  if v_project_id is null then
    raise exception 'العقد غير موجود';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية حذف هذا العقد';
  end if;
  if v_status not in ('draft', 'rejected') then
    raise exception 'لا يمكن حذف عقد معتمد أو قيد الاعتماد — فقط العقود بحالة مسودة أو مرفوضة';
  end if;

  delete from public.contracts where id = p_contract_id;
end;
$$;

grant execute on function public.delete_contract(uuid) to authenticated;
