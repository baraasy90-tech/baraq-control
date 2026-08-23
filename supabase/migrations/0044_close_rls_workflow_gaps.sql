-- إصلاح ثغرات أمنية عالية الخطورة اكتُشفت بتدقيق RLS شامل:
-- H1: سياسات "scoped access" على contracts/contract_payments/contract_extra_works/
--     material_requests كانت FOR ALL تسمح بـ UPDATE مباشر من أي عضو بالمشروع، رغم
--     أن منطق الاعتماد الفعلي محصور بدوال RPC — أي عضو عادي كان يقدر يزوّر حالة
--     الاعتماد واسم المعتمد وقيمة العقد مباشرة عبر REST API بدل المرور بالـ RPC.
-- الحل: trigger عام يمنع تعديل أعمدة سير الاعتماد (status/*_reviewed_by/...) وأعمدة
-- القيمة المالية إلا من داخل دوال RPC نفسها (عبر علم جلسة مؤقت app.bypass_workflow_guard).
-- كل دوال submit_*/review_* الحالية تُعاد بنفس المنطق + سطر تفعيل العلم، ونضيف RPC
-- جديدة (submit_contract, submit_contract_payment, reset_contract_to_draft) تحل محل
-- التحديث المباشر من الواجهة الأمامية.

-- ============================================================
-- 1) دالة الحراسة العامة لأعمدة سير الاعتماد (تُمرَّر أسماء الأعمدة كوسائط trigger)
-- ============================================================
create or replace function public.guard_protected_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  col text;
begin
  if current_setting('app.bypass_workflow_guard', true) = 'on' then
    return new;
  end if;
  foreach col in array tg_argv loop
    if (to_jsonb(new) -> col) is distinct from (to_jsonb(old) -> col) then
      raise exception 'العمود "%" محمي ولا يمكن تعديله إلا عبر إجراء الاعتماد الرسمي', col;
    end if;
  end loop;
  return new;
end;
$$;

-- ============================================================
-- 2) تجميد القيمة المالية بعد الرفع للاعتماد (تمنع رفع قيمة عقد/بند بعد اعتماده)
-- ============================================================
create or replace function public.guard_contract_value_freeze()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if current_setting('app.bypass_workflow_guard', true) = 'on' then
    return new;
  end if;
  if old.status <> 'draft' and (
       new.total_value is distinct from old.total_value
    or new.vat_inclusive is distinct from old.vat_inclusive
    or new.vat_rate is distinct from old.vat_rate
  ) then
    raise exception 'لا يمكن تعديل قيمة العقد بعد رفعها للاعتماد؛ أعد العقد للمسودة أولاً';
  end if;
  return new;
end;
$$;

create or replace function public.guard_payment_value_freeze()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if current_setting('app.bypass_workflow_guard', true) = 'on' then
    return new;
  end if;
  if old.status <> 'pending' and (
       new.amount is distinct from old.amount
    or new.percentage is distinct from old.percentage
  ) then
    raise exception 'لا يمكن تعديل قيمة الدفعة بعد رفعها للاعتماد';
  end if;
  return new;
end;
$$;

create or replace function public.guard_extra_work_value_freeze()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if current_setting('app.bypass_workflow_guard', true) = 'on' then
    return new;
  end if;
  if old.status <> 'draft' and new.amount is distinct from old.amount then
    raise exception 'لا يمكن تعديل قيمة البند الإضافي بعد رفعه للاعتماد';
  end if;
  return new;
end;
$$;

create or replace function public.guard_material_value_freeze()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if current_setting('app.bypass_workflow_guard', true) = 'on' then
    return new;
  end if;
  if old.status not in ('draft', 'sample_rejected') and new.sample_price is distinct from old.sample_price then
    raise exception 'لا يمكن تعديل سعر العينة بعد رفعها للاعتماد';
  end if;
  if old.status not in ('sample_approved', 'purchase_rejected') and new.quote_price is distinct from old.quote_price then
    raise exception 'لا يمكن تعديل سعر عرض الشراء بعد رفعه للاعتماد';
  end if;
  return new;
end;
$$;

-- ============================================================
-- 3) تفعيل الحراسة على الجداول الأربعة
-- ============================================================
drop trigger if exists guard_contracts_workflow on public.contracts;
create trigger guard_contracts_workflow
before update on public.contracts
for each row execute function public.guard_protected_columns(
  'status', 'submitted_by', 'submitted_at',
  'pm_reviewed_by', 'pm_reviewed_at', 'pm_review_note',
  'finance_reviewed_by', 'finance_reviewed_at', 'finance_review_note',
  'settlement_status', 'settlement_note', 'settlement_submitted_by', 'settlement_submitted_at',
  'settlement_pm_reviewed_by', 'settlement_pm_reviewed_at', 'settlement_pm_review_note',
  'settlement_finance_reviewed_by', 'settlement_finance_reviewed_at', 'settlement_finance_review_note',
  'settled_at'
);

drop trigger if exists guard_contracts_value on public.contracts;
create trigger guard_contracts_value
before update on public.contracts
for each row execute function public.guard_contract_value_freeze();

drop trigger if exists guard_contract_payments_workflow on public.contract_payments;
create trigger guard_contract_payments_workflow
before update on public.contract_payments
for each row execute function public.guard_protected_columns(
  'status', 'submitted_by', 'submitted_at',
  'pm_reviewed_by', 'pm_reviewed_at', 'pm_review_note',
  'finance_reviewed_by', 'finance_reviewed_at', 'finance_review_note'
);

drop trigger if exists guard_contract_payments_value on public.contract_payments;
create trigger guard_contract_payments_value
before update on public.contract_payments
for each row execute function public.guard_payment_value_freeze();

drop trigger if exists guard_contract_extra_works_workflow on public.contract_extra_works;
create trigger guard_contract_extra_works_workflow
before update on public.contract_extra_works
for each row execute function public.guard_protected_columns(
  'status', 'submitted_by', 'submitted_at',
  'pm_reviewed_by', 'pm_reviewed_at', 'pm_review_note',
  'finance_reviewed_by', 'finance_reviewed_at', 'finance_review_note'
);

drop trigger if exists guard_contract_extra_works_value on public.contract_extra_works;
create trigger guard_contract_extra_works_value
before update on public.contract_extra_works
for each row execute function public.guard_extra_work_value_freeze();

drop trigger if exists guard_material_requests_workflow on public.material_requests;
create trigger guard_material_requests_workflow
before update on public.material_requests
for each row execute function public.guard_protected_columns(
  'status',
  'sample_submitted_by', 'sample_submitted_at',
  'sample_pm_reviewed_by', 'sample_pm_reviewed_at', 'sample_pm_review_note',
  'sample_executive_reviewed_by', 'sample_executive_reviewed_at', 'sample_executive_review_note',
  'purchase_submitted_by', 'purchase_submitted_at',
  'purchase_pm_reviewed_by', 'purchase_pm_reviewed_at', 'purchase_pm_review_note',
  'purchase_finance_reviewed_by', 'purchase_finance_reviewed_at', 'purchase_finance_review_note'
);

drop trigger if exists guard_material_requests_value on public.material_requests;
create trigger guard_material_requests_value
before update on public.material_requests
for each row execute function public.guard_material_value_freeze();

-- ============================================================
-- 4) إعادة تعريف كل دوال submit_*/review_* الحالية لتفعيل علم تجاوز الحراسة
--    (المنطق نفسه تماماً بدون أي تغيير سلوكي، فقط إضافة سطر set_config)
-- ============================================================

create or replace function public.review_contract(p_contract_id uuid, p_approve boolean, p_note text)
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

  perform set_config('app.bypass_workflow_guard', 'on', true);

  if v_status = 'pending_pm_approval' then
    if not public.can_pm_approve(v_project_id) then
      raise exception 'لا تملك صلاحية اعتماد العقود بهذه المرحلة (رئيس قسم إدارة المشاريع)';
    end if;
    update public.contracts
    set status = case when p_approve then 'pending_finance_approval' else 'rejected' end,
        pm_reviewed_by = auth.uid(), pm_reviewed_at = now(), pm_review_note = p_note
    where id = p_contract_id;
  elsif v_status = 'pending_finance_approval' then
    if not public.can_finance_approve(v_project_id) then
      raise exception 'لا تملك صلاحية الاعتماد المالي النهائي';
    end if;
    update public.contracts
    set status = case when p_approve then 'approved' else 'rejected' end,
        finance_reviewed_by = auth.uid(), finance_reviewed_at = now(), finance_review_note = p_note
    where id = p_contract_id;
  else
    raise exception 'هذا العقد ليس بانتظار اعتماد حالياً';
  end if;
end;
$$;

create or replace function public.review_contract_payment(p_payment_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
begin
  select p.project_id, cp.status into v_project_id, v_status
  from public.contract_payments cp
  join public.contracts c on c.id = cp.contract_id
  join public.projects p on p.id = c.project_id
  where cp.id = p_payment_id;

  if v_project_id is null then
    raise exception 'الدفعة غير موجودة';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);

  if v_status = 'pending_pm_approval' then
    if not public.can_pm_approve(v_project_id) then
      raise exception 'لا تملك صلاحية اعتماد الدفعات بهذه المرحلة (رئيس قسم إدارة المشاريع)';
    end if;
    update public.contract_payments
    set status = case when p_approve then 'pending_finance_approval' else 'rejected' end,
        pm_reviewed_by = auth.uid(), pm_reviewed_at = now(), pm_review_note = p_note
    where id = p_payment_id;
  elsif v_status = 'pending_finance_approval' then
    if not public.can_finance_approve(v_project_id) then
      raise exception 'لا تملك صلاحية الاعتماد المالي النهائي';
    end if;
    update public.contract_payments
    set status = case when p_approve then 'approved' else 'rejected' end,
        finance_reviewed_by = auth.uid(), finance_reviewed_at = now(), finance_review_note = p_note
    where id = p_payment_id;
  else
    raise exception 'هذه الدفعة ليست بانتظار اعتماد حالياً';
  end if;
end;
$$;

create or replace function public.submit_contract_extra_work(p_extra_work_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
  v_amount numeric;
begin
  select p.id, ew.status, ew.amount into v_project_id, v_status, v_amount
  from public.contract_extra_works ew
  join public.contracts c on c.id = ew.contract_id
  join public.projects p on p.id = c.project_id
  where ew.id = p_extra_work_id;

  if v_project_id is null then
    raise exception 'البند غير موجود';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا المشروع';
  end if;
  if v_status not in ('draft', 'rejected') then
    raise exception 'هذا البند ليس في مرحلة تسمح بالتقديم للاعتماد';
  end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'لازم إدخال قيمة صحيحة للبند أولاً';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);
  update public.contract_extra_works
  set status = 'pending_pm_approval',
      submitted_by = auth.uid(), submitted_at = now(),
      pm_reviewed_by = null, pm_reviewed_at = null, pm_review_note = null,
      finance_reviewed_by = null, finance_reviewed_at = null, finance_review_note = null
  where id = p_extra_work_id;
end;
$$;

create or replace function public.review_contract_extra_work(p_extra_work_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
begin
  select p.id, ew.status into v_project_id, v_status
  from public.contract_extra_works ew
  join public.contracts c on c.id = ew.contract_id
  join public.projects p on p.id = c.project_id
  where ew.id = p_extra_work_id;

  if v_project_id is null then
    raise exception 'البند غير موجود';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);

  if v_status = 'pending_pm_approval' then
    if not public.can_pm_approve(v_project_id) then
      raise exception 'لا تملك صلاحية اعتماد الأعمال الإضافية بهذه المرحلة (رئيس قسم إدارة المشاريع)';
    end if;
    update public.contract_extra_works
    set status = case when p_approve then 'pending_finance_approval' else 'rejected' end,
        pm_reviewed_by = auth.uid(), pm_reviewed_at = now(), pm_review_note = p_note
    where id = p_extra_work_id;
  elsif v_status = 'pending_finance_approval' then
    if not public.can_finance_approve(v_project_id) then
      raise exception 'لا تملك صلاحية الاعتماد المالي النهائي';
    end if;
    update public.contract_extra_works
    set status = case when p_approve then 'approved' else 'rejected' end,
        finance_reviewed_by = auth.uid(), finance_reviewed_at = now(), finance_review_note = p_note
    where id = p_extra_work_id;
  else
    raise exception 'هذا البند ليس بانتظار اعتماد حالياً';
  end if;
end;
$$;

create or replace function public.submit_material_sample(p_request_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
  v_sample_price numeric;
begin
  select project_id, status, sample_price into v_project_id, v_status, v_sample_price
  from public.material_requests where id = p_request_id;

  if v_project_id is null then
    raise exception 'طلب المادة غير موجود';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا المشروع';
  end if;
  if v_status not in ('draft', 'sample_rejected') then
    raise exception 'هذا الطلب ليس في مرحلة تسمح بتقديم العينة للاعتماد';
  end if;
  if v_sample_price is null then
    raise exception 'لازم إدخال سعر العينة أولاً';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);
  update public.material_requests
  set status = 'sample_pending_pm_approval',
      sample_submitted_by = auth.uid(), sample_submitted_at = now(),
      sample_pm_reviewed_by = null, sample_pm_reviewed_at = null, sample_pm_review_note = null,
      sample_executive_reviewed_by = null, sample_executive_reviewed_at = null, sample_executive_review_note = null
  where id = p_request_id;
end;
$$;

create or replace function public.review_material_sample(p_request_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
begin
  select project_id, status into v_project_id, v_status from public.material_requests where id = p_request_id;
  if v_project_id is null then
    raise exception 'طلب المادة غير موجود';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);

  if v_status = 'sample_pending_pm_approval' then
    if not public.can_pm_approve(v_project_id) then
      raise exception 'لا تملك صلاحية اعتماد العينة بهذه المرحلة (رئيس قسم إدارة المشاريع)';
    end if;
    update public.material_requests
    set status = case when p_approve then 'sample_pending_executive_approval' else 'sample_rejected' end,
        sample_pm_reviewed_by = auth.uid(), sample_pm_reviewed_at = now(), sample_pm_review_note = p_note
    where id = p_request_id;
  elsif v_status = 'sample_pending_executive_approval' then
    if not public.can_executive_approve(v_project_id) then
      raise exception 'لا تملك صلاحية اعتماد العينة النهائي (الإدارة التنفيذية)';
    end if;
    update public.material_requests
    set status = case when p_approve then 'sample_approved' else 'sample_rejected' end,
        sample_executive_reviewed_by = auth.uid(), sample_executive_reviewed_at = now(), sample_executive_review_note = p_note
    where id = p_request_id;
  else
    raise exception 'هذه العينة ليست بانتظار اعتماد حالياً';
  end if;
end;
$$;

create or replace function public.submit_material_purchase(p_request_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
  v_quote_price numeric;
begin
  select project_id, status, quote_price into v_project_id, v_status, v_quote_price
  from public.material_requests where id = p_request_id;

  if v_project_id is null then
    raise exception 'طلب المادة غير موجود';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا المشروع';
  end if;
  if v_status not in ('sample_approved', 'purchase_rejected') then
    raise exception 'يلزم اعتماد العينة أولاً قبل تقديم طلب الشراء الرسمي';
  end if;
  if v_quote_price is null then
    raise exception 'لازم إدخال سعر عرض السعر أولاً';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);
  update public.material_requests
  set status = 'purchase_pending_pm_approval',
      purchase_submitted_by = auth.uid(), purchase_submitted_at = now(),
      purchase_pm_reviewed_by = null, purchase_pm_reviewed_at = null, purchase_pm_review_note = null,
      purchase_finance_reviewed_by = null, purchase_finance_reviewed_at = null, purchase_finance_review_note = null
  where id = p_request_id;
end;
$$;

create or replace function public.review_material_purchase(p_request_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
begin
  select project_id, status into v_project_id, v_status from public.material_requests where id = p_request_id;
  if v_project_id is null then
    raise exception 'طلب المادة غير موجود';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);

  if v_status = 'purchase_pending_pm_approval' then
    if not public.can_pm_approve(v_project_id) then
      raise exception 'لا تملك صلاحية اعتماد قيمة الشراء بهذه المرحلة (رئيس قسم إدارة المشاريع)';
    end if;
    update public.material_requests
    set status = case when p_approve then 'purchase_pending_finance_approval' else 'purchase_rejected' end,
        purchase_pm_reviewed_by = auth.uid(), purchase_pm_reviewed_at = now(), purchase_pm_review_note = p_note
    where id = p_request_id;
  elsif v_status = 'purchase_pending_finance_approval' then
    if not public.can_finance_approve(v_project_id) then
      raise exception 'لا تملك صلاحية الاعتماد المالي النهائي للصرف';
    end if;
    update public.material_requests
    set status = case when p_approve then 'purchase_approved' else 'purchase_rejected' end,
        purchase_finance_reviewed_by = auth.uid(), purchase_finance_reviewed_at = now(), purchase_finance_review_note = p_note
    where id = p_request_id;
  else
    raise exception 'هذا الطلب ليس بانتظار اعتماد حالياً';
  end if;
end;
$$;

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

  perform set_config('app.bypass_workflow_guard', 'on', true);
  update public.contracts
  set settlement_status = 'pending_pm_approval',
      settlement_note = p_note,
      settlement_submitted_by = auth.uid(), settlement_submitted_at = now(),
      settlement_pm_reviewed_by = null, settlement_pm_reviewed_at = null, settlement_pm_review_note = null,
      settlement_finance_reviewed_by = null, settlement_finance_reviewed_at = null, settlement_finance_review_note = null
  where id = p_contract_id;
end;
$$;

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

  perform set_config('app.bypass_workflow_guard', 'on', true);

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

-- ============================================================
-- 5) دوال RPC جديدة تحل محل التحديث المباشر من الواجهة الأمامية
-- ============================================================

create or replace function public.submit_contract(p_contract_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
  v_total_value numeric;
begin
  select project_id, status, total_value into v_project_id, v_status, v_total_value
  from public.contracts where id = p_contract_id;

  if v_project_id is null then
    raise exception 'العقد غير موجود';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا المشروع';
  end if;
  if v_status <> 'draft' then
    raise exception 'هذا العقد ليس في مرحلة مسودة';
  end if;
  if v_total_value is null or v_total_value <= 0 then
    raise exception 'لازم إدخال قيمة صحيحة للعقد أولاً';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);
  update public.contracts
  set status = 'pending_pm_approval', submitted_by = auth.uid(), submitted_at = now()
  where id = p_contract_id;
end;
$$;

grant execute on function public.submit_contract(uuid) to authenticated;

create or replace function public.submit_contract_payment(p_payment_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
begin
  select p.project_id, cp.status into v_project_id, v_status
  from public.contract_payments cp
  join public.contracts c on c.id = cp.contract_id
  join public.projects p on p.id = c.project_id
  where cp.id = p_payment_id;

  if v_project_id is null then
    raise exception 'الدفعة غير موجودة';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا المشروع';
  end if;
  if v_status <> 'pending' then
    raise exception 'هذه الدفعة ليست في مرحلة قابلة للتقديم';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);
  update public.contract_payments
  set status = 'pending_pm_approval', submitted_by = auth.uid(), submitted_at = now()
  where id = p_payment_id;
end;
$$;

grant execute on function public.submit_contract_payment(uuid) to authenticated;

create or replace function public.reset_contract_to_draft(p_contract_id uuid)
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
  if not public.can_pm_approve(v_project_id) then
    raise exception 'لا تملك صلاحية إعادة العقد للمسودة';
  end if;
  if v_status <> 'approved' then
    raise exception 'لا يمكن إعادة عقد لم يُعتمد بعد إلى المسودة';
  end if;

  perform set_config('app.bypass_workflow_guard', 'on', true);
  update public.contracts
  set status = 'draft',
      submitted_by = null, submitted_at = null,
      pm_reviewed_by = null, pm_reviewed_at = null, pm_review_note = null,
      finance_reviewed_by = null, finance_reviewed_at = null, finance_review_note = null
  where id = p_contract_id;
end;
$$;

grant execute on function public.reset_contract_to_draft(uuid) to authenticated;

-- ============================================================
-- H2(أ): انتماء الشركة (profiles.company_id) لم يعد قابلاً للكتابة المباشرة من
-- المتصفح إطلاقاً — فقط عبر دوال RPC موثوقة (create_company / accept_invite /
-- join_company_by_code)، التي تعمل بصلاحيات مالك قاعدة البيانات فتتجاوز هذا القيد.
-- هذا يقفل مشكلتين معاً: (1) مستخدم يضع نفسه بشركة أخرى بمعرفة company_id فقط،
-- (2) موظف سابق يُعيد نفسه لشركة أُخرج منها لأن الوصول لم يكن يُسحب فعلياً.
-- ============================================================

revoke update (company_id) on public.profiles from authenticated;

create or replace function public.create_company(
  p_name text,
  p_logo_url text,
  p_archive_folder_name text,
  p_archive_storage_type text,
  p_archive_local_path text
)
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
    raise exception 'لديك شركة بالفعل';
  end if;

  insert into public.companies (name, logo_url, archive_folder_name, archive_storage_type, archive_local_path)
  values (p_name, p_logo_url, p_archive_folder_name, p_archive_storage_type, p_archive_local_path)
  returning * into v_company;

  update public.profiles set company_id = v_company.id where id = auth.uid();

  return v_company;
end;
$$;

grant execute on function public.create_company(text, text, text, text, text) to authenticated;
