-- "التصفية النهائية" لكل عقد: إجراء إغلاق ختامي منفصل عن اعتماد العقد نفسه
-- (contracts.status يبقى 'approved' طوال حياة العقد التنفيذية). يمر بنفس تسلسل
-- الاعتماد الثنائي (مدير المشروع يبدأ ← رئيس قسم إدارة المشاريع ← المدير المالي
-- للاعتماد النهائي)، وبعد الاعتماد النهائي يصبح العقد settlement_status = 'settled'
-- بشكل نهائي (لا رجوع تلقائياً، كإجراء إداري متعمّد).

alter table public.contracts add column settlement_status text not null default 'open'
  check (settlement_status in ('open', 'pending_pm_approval', 'pending_finance_approval', 'settled', 'rejected'));
alter table public.contracts add column settlement_note text;
alter table public.contracts add column settlement_submitted_by uuid references public.profiles (id) on delete set null;
alter table public.contracts add column settlement_submitted_at timestamptz;
alter table public.contracts add column settlement_pm_reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.contracts add column settlement_pm_reviewed_at timestamptz;
alter table public.contracts add column settlement_pm_review_note text;
alter table public.contracts add column settlement_finance_reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.contracts add column settlement_finance_reviewed_at timestamptz;
alter table public.contracts add column settlement_finance_review_note text;
alter table public.contracts add column settled_at timestamptz;

create or replace function public.submit_contract_settlement(p_contract_id uuid, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
  v_settlement_status text;
begin
  select project_id, status, settlement_status into v_project_id, v_status, v_settlement_status
  from public.contracts where id = p_contract_id;

  if v_project_id is null then
    raise exception 'العقد غير موجود';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا المشروع';
  end if;
  if v_status <> 'approved' then
    raise exception 'لا يمكن بدء التصفية النهائية إلا لعقد معتمد';
  end if;
  if v_settlement_status not in ('open', 'rejected') then
    raise exception 'إجراء التصفية النهائية بدأ بالفعل لهذا العقد';
  end if;

  update public.contracts
  set settlement_status = 'pending_pm_approval',
      settlement_note = p_note,
      settlement_submitted_by = auth.uid(), settlement_submitted_at = now(),
      settlement_pm_reviewed_by = null, settlement_pm_reviewed_at = null, settlement_pm_review_note = null,
      settlement_finance_reviewed_by = null, settlement_finance_reviewed_at = null, settlement_finance_review_note = null
  where id = p_contract_id;
end;
$$;

grant execute on function public.submit_contract_settlement(uuid, text) to authenticated;

create or replace function public.review_contract_settlement(p_contract_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_settlement_status text;
begin
  select project_id, settlement_status into v_project_id, v_settlement_status
  from public.contracts where id = p_contract_id;

  if v_project_id is null then
    raise exception 'العقد غير موجود';
  end if;

  if v_settlement_status = 'pending_pm_approval' then
    if not public.can_pm_approve(v_project_id) then
      raise exception 'لا تملك صلاحية اعتماد التصفية بهذه المرحلة (رئيس قسم إدارة المشاريع)';
    end if;
    update public.contracts
    set settlement_status = case when p_approve then 'pending_finance_approval' else 'rejected' end,
        settlement_pm_reviewed_by = auth.uid(), settlement_pm_reviewed_at = now(), settlement_pm_review_note = p_note
    where id = p_contract_id;
  elsif v_settlement_status = 'pending_finance_approval' then
    if not public.can_finance_approve(v_project_id) then
      raise exception 'لا تملك صلاحية الاعتماد المالي النهائي للتصفية';
    end if;
    update public.contracts
    set settlement_status = case when p_approve then 'settled' else 'rejected' end,
        settlement_finance_reviewed_by = auth.uid(), settlement_finance_reviewed_at = now(), settlement_finance_review_note = p_note,
        settled_at = case when p_approve then now() else null end
    where id = p_contract_id;
  else
    raise exception 'هذا العقد ليس بانتظار اعتماد تصفية حالياً';
  end if;
end;
$$;

grant execute on function public.review_contract_settlement(uuid, boolean, text) to authenticated;
