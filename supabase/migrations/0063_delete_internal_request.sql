-- إضافة خيار حذف لطلب داخلي (بأي حالة: معلّق أو معتمد أو مرفوض) — لصاحب الطلب نفسه
-- أو لمدير الحساب/الإدارة التنفيذية. الحذف يُزيل تلقائياً (cascade) سلسلة الاعتماد
-- ومراحلها والمرفقات ونسخها التابعة للطلب، لأنها كلها مرتبطة بـ on delete cascade.

create or replace function public.delete_internal_request(p_request_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_company_id uuid;
begin
  select user_id, company_id into v_user_id, v_company_id
  from public.internal_requests where id = p_request_id;

  if v_user_id is null then
    raise exception 'الطلب غير موجود';
  end if;
  if v_user_id <> auth.uid() and not public.can_manage_org(v_company_id) then
    raise exception 'لا تملك صلاحية حذف هذا الطلب';
  end if;

  delete from public.internal_requests where id = p_request_id;
end;
$$;

grant execute on function public.delete_internal_request(uuid) to authenticated;
