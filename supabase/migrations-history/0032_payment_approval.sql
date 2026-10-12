-- آلية اعتماد لكل دفعة/مستخلص على حدة: قيد الإعداد → مُقدَّمة (من مدير المشروع) → معتمدة (من
-- مدير الحساب/الإدارة التنفيذية أو الإدارة المالية) أو مرفوضة → ثم تُسجَّل كمدفوعة فعلياً.
-- الاعتماد نفسه عبر دالة مخصصة بنفس نمط اعتماد العقود، لأنه إجراء حسّاس منفصل عن التعديل العادي.

alter table public.contract_payments
  add column status text not null default 'pending' check (status in ('pending', 'submitted', 'approved', 'rejected'));
alter table public.contract_payments add column submitted_by uuid references public.profiles (id) on delete set null;
alter table public.contract_payments add column submitted_at timestamptz;
alter table public.contract_payments add column reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.contract_payments add column reviewed_at timestamptz;
alter table public.contract_payments add column review_note text;

create or replace function public.review_contract_payment(p_payment_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
begin
  select p.project_id into v_project_id
  from public.contract_payments cp
  join public.contracts c on c.id = cp.contract_id
  join public.projects p on p.id = c.project_id
  where cp.id = p_payment_id;

  if v_project_id is null then
    raise exception 'الدفعة غير موجودة';
  end if;
  if not public.can_approve_budget_variance(v_project_id) then
    raise exception 'لا تملك صلاحية اعتماد الدفعات';
  end if;

  update public.contract_payments
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_note
  where id = p_payment_id;
end;
$$;

grant execute on function public.review_contract_payment(uuid, boolean, text) to authenticated;
