-- إضافة إمكانية "إعادة توجيه" مرحلة اعتماد نشطة **بعد** أن تكون موجَّهة بالفعل لشخص
-- محدد — الحالي route_approval_step يرفض التوجيه إن كانت المرحلة موجّهة مسبقاً
-- (مصمَّم عمداً لمنع التوجيه المزدوج)، لكن هذا لا يترك أي وسيلة لرئيس القسم لتحويل
-- الطلب لموظف آخر غير الذي وُجِّه له أول مرة لو تبيّن أنه ليس الشخص المناسب — وهو
-- بالضبط ما احتاجه المستخدم: "وجّهت الطلب لشخص آخر لكن لا يوجد خيار إرسال".

create or replace function public.reroute_approval_step(p_step_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_department_id uuid;
  v_step_status text;
  v_chain_status text;
begin
  select chain_id, step_order, department_id, status
  into v_chain_id, v_step_order, v_department_id, v_step_status
  from public.approval_chain_steps where id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;
  select status into v_chain_status from public.approval_chains where id = v_chain_id;
  if v_chain_status <> 'pending' then
    raise exception 'سلسلة الاعتماد هذه غير نشطة حالياً';
  end if;
  if v_step_status <> 'pending' then
    raise exception 'هذه المرحلة ليست بانتظار إجراء';
  end if;
  if v_department_id is null then
    raise exception 'هذه المرحلة موجّهة لشخص محدد عند إنشاء السلسلة، لا يمكن إعادة توجيهها';
  end if;
  if exists (
    select 1 from public.approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> 'approved'
  ) then
    raise exception 'لم يصل الدور لهذه المرحلة بعد';
  end if;
  if not public.is_department_head(v_department_id) then
    raise exception 'لا تملك صلاحية إعادة توجيه طلبات هذا القسم (رئيس القسم فقط)';
  end if;

  update public.approval_chain_steps
  set assigned_user_id = p_user_id, routed_by = auth.uid(), routed_at = now()
  where id = p_step_id;
end;
$$;

grant execute on function public.reroute_approval_step(uuid, uuid) to authenticated;

-- ===== نفس الإضافة لسلاسل "طلباتي" الداخلية (نفس الفجوة، نفس الحل) =====
create or replace function public.reroute_internal_approval_step(p_step_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_department_id uuid;
  v_step_status text;
  v_chain_status text;
begin
  select chain_id, step_order, department_id, status
  into v_chain_id, v_step_order, v_department_id, v_step_status
  from public.internal_approval_chain_steps where id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;
  select status into v_chain_status from public.internal_approval_chains where id = v_chain_id;
  if v_chain_status <> 'pending' then
    raise exception 'سلسلة الاعتماد هذه غير نشطة حالياً';
  end if;
  if v_step_status <> 'pending' then
    raise exception 'هذه المرحلة ليست بانتظار إجراء';
  end if;
  if v_department_id is null then
    raise exception 'هذه المرحلة موجّهة لشخص محدد عند إنشاء السلسلة، لا يمكن إعادة توجيهها';
  end if;
  if exists (
    select 1 from public.internal_approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> 'approved'
  ) then
    raise exception 'لم يصل الدور لهذه المرحلة بعد';
  end if;
  if not public.is_department_head(v_department_id) then
    raise exception 'لا تملك صلاحية إعادة توجيه طلبات هذا القسم (رئيس القسم فقط)';
  end if;

  update public.internal_approval_chain_steps
  set assigned_user_id = p_user_id, routed_by = auth.uid(), routed_at = now()
  where id = p_step_id;
end;
$$;

grant execute on function public.reroute_internal_approval_step(uuid, uuid) to authenticated;
