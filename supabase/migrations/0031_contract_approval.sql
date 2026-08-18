-- آلية اعتماد العقود: مسودة → بانتظار الاعتماد → معتمد/مرفوض. الاعتماد نفسه محصور بمدير
-- الحساب/الإدارة التنفيذية أو أي عضو بقسم "الإدارة المالية" (نفس نطاق can_approve_budget_variance)،
-- عبر دالة مخصصة بدل سياسة RLS عامة، لأن هذا إجراء حسّاس منفصل عن التعديل العادي للعقد.

alter table public.contracts add column status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'rejected'));
alter table public.contracts add column submitted_by uuid references public.profiles (id) on delete set null;
alter table public.contracts add column submitted_at timestamptz;
alter table public.contracts add column reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.contracts add column reviewed_at timestamptz;
alter table public.contracts add column review_note text;

create or replace function public.review_contract(p_contract_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
begin
  select project_id into v_project_id from public.contracts where id = p_contract_id;
  if v_project_id is null then
    raise exception 'العقد غير موجود';
  end if;
  if not public.can_approve_budget_variance(v_project_id) then
    raise exception 'لا تملك صلاحية اعتماد العقود';
  end if;

  update public.contracts
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_note
  where id = p_contract_id;
end;
$$;

grant execute on function public.review_contract(uuid, boolean, text) to authenticated;
