-- تصحيح مرحلة 1 (طلب العينة) من "سلسلة حرة يبنيها رافع الطلب" إلى تدفق ثابت خاص
-- بالمشتريات، بناءً على توضيح المستخدم:
--   مدير المشروع يرسل طلب مادة لقسم المشتريات مع مرفقات (صور/نص/ملفات) توضّح المطلوب
--   ← قسم المشتريات يرفق عرضه أو عدة بدائل (كل بديل: نص + سعر + صور)
--   ← يتحول تلقائياً لمُقدِّم الطلب نفسه للاعتماد
--   ← يتحول تلقائياً لرئيس قسم إدارة المشاريع للاعتماد النهائي
-- التسلسل الصارم ومنطق الرفض (0043) يبقى كما هو — فقط طريقة بناء السلسلة تتحول من
-- اختيار حر (submit_material_sample_chain) إلى توليد تلقائي بثلاث مراحل ثابتة.
-- سلسلة الشراء الرسمي (المرحلة 2) تبقى حرة كما هي — التصحيح يخص العينة فقط.

drop function if exists public.submit_material_sample_chain(uuid, jsonb, text);

-- سعر العينة ما عاد يُدخله رافع الطلب مقدّماً — قسم المشتريات هو اللي يبحث عنه ويرفقه
-- كخيار (أو عدة خيارات) بجدول material_request_options بعد الاستلام.
alter table public.material_requests drop column sample_price;
alter table public.material_requests drop column sample_received_at;

create table public.material_request_options (
  id uuid primary key default gen_random_uuid(),
  material_request_id uuid not null references public.material_requests (id) on delete cascade,
  description text not null,
  price numeric,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index material_request_options_material_request_id_idx on public.material_request_options (material_request_id);

create table public.material_request_attachments (
  id uuid primary key default gen_random_uuid(),
  material_request_id uuid not null references public.material_requests (id) on delete cascade,
  option_id uuid references public.material_request_options (id) on delete cascade,
  file_url text not null,
  file_name text not null,
  uploaded_by uuid references public.profiles (id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index material_request_attachments_material_request_id_idx on public.material_request_attachments (material_request_id);
create index material_request_attachments_option_id_idx on public.material_request_attachments (option_id);

alter table public.material_request_options enable row level security;
alter table public.material_request_attachments enable row level security;

create policy "scoped access material_request_options" on public.material_request_options
  for all using (
    material_request_id in (select mr.id from public.material_requests mr where public.can_access_project(mr.project_id))
  )
  with check (
    material_request_id in (select mr.id from public.material_requests mr where public.can_access_project(mr.project_id))
  );

create policy "scoped access material_request_attachments" on public.material_request_attachments
  for all using (
    material_request_id in (select mr.id from public.material_requests mr where public.can_access_project(mr.project_id))
  )
  with check (
    material_request_id in (select mr.id from public.material_requests mr where public.can_access_project(mr.project_id))
  );

-- ===== تقديم طلب العينة بتدفق ثابت: مشتريات ← مُقدِّم الطلب ← رئيس قسم إدارة المشاريع =====
create or replace function public.submit_material_sourcing(p_request_id uuid, p_note text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
  v_created_by uuid;
  v_company_id uuid;
  v_procurement_dept uuid;
  v_pm_dept uuid;
  v_chain_id uuid;
begin
  select project_id, status, created_by into v_project_id, v_status, v_created_by
  from public.material_requests where id = p_request_id;

  if v_project_id is null then
    raise exception 'طلب المادة غير موجود';
  end if;
  if not public.can_access_project(v_project_id) then
    raise exception 'لا تملك صلاحية الوصول لهذا المشروع';
  end if;
  if v_status not in ('draft', 'sample_rejected') then
    raise exception 'هذا الطلب ليس في مرحلة تسمح بإرساله للمشتريات';
  end if;

  select company_id into v_company_id from public.projects where id = v_project_id;

  select id into v_procurement_dept from public.departments where company_id = v_company_id and type = 'procurement' limit 1;
  if v_procurement_dept is null then
    raise exception 'ما فيه قسم "مشتريات" مُنشأ بهيكلة الشركة بعد — أنشئه أولاً من شاشة الهيكلة';
  end if;

  select id into v_pm_dept from public.departments where company_id = v_company_id and type = 'project_management' limit 1;
  if v_pm_dept is null then
    raise exception 'ما فيه قسم "إدارة المشاريع" مُنشأ بهيكلة الشركة';
  end if;

  insert into public.approval_chains (material_request_id, phase, created_by, requester_note)
  values (p_request_id, 'sample', auth.uid(), p_note)
  returning id into v_chain_id;

  insert into public.approval_chain_steps (chain_id, step_order, department_id, assigned_user_id) values
    (v_chain_id, 1, v_procurement_dept, null),
    (v_chain_id, 2, null, v_created_by),
    (v_chain_id, 3, v_pm_dept, null);

  update public.material_requests set status = 'sample_pending' where id = p_request_id;

  return v_chain_id;
end;
$$;

grant execute on function public.submit_material_sourcing(uuid, text) to authenticated;

-- ===== تعديل اعتماد المرحلة: مرحلة قسم "المشتريات" لا تُعتمد بدون عرض واحد على الأقل =====
create or replace function public.review_approval_step(p_step_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_chain_id uuid;
  v_step_order integer;
  v_assigned_user_id uuid;
  v_step_department_id uuid;
  v_step_status text;
  v_chain_status text;
  v_phase text;
  v_material_request_id uuid;
  v_company_id uuid;
  v_max_order integer;
  v_department_type text;
begin
  select acs.chain_id, acs.step_order, acs.assigned_user_id, acs.department_id, acs.status
  into v_chain_id, v_step_order, v_assigned_user_id, v_step_department_id, v_step_status
  from public.approval_chain_steps acs where acs.id = p_step_id;

  if v_chain_id is null then
    raise exception 'مرحلة الاعتماد غير موجودة';
  end if;

  select ac.status, ac.phase, ac.material_request_id, p.company_id
  into v_chain_status, v_phase, v_material_request_id, v_company_id
  from public.approval_chains ac
  join public.material_requests mr on mr.id = ac.material_request_id
  join public.projects p on p.id = mr.project_id
  where ac.id = v_chain_id;

  if v_chain_status <> 'pending' then
    raise exception 'سلسلة الاعتماد هذه غير نشطة حالياً';
  end if;
  if v_step_status <> 'pending' then
    raise exception 'هذه المرحلة ليست بانتظار إجراء';
  end if;
  if exists (
    select 1 from public.approval_chain_steps
    where chain_id = v_chain_id and step_order < v_step_order and status <> 'approved'
  ) then
    raise exception 'لم يصل الدور لهذه المرحلة بعد';
  end if;
  if v_assigned_user_id is null then
    raise exception 'يلزم توجيه هذه المرحلة لشخص محدد قبل اعتمادها';
  end if;
  if v_assigned_user_id <> auth.uid() and not public.can_manage_org(v_company_id) then
    raise exception 'لا تملك صلاحية الاعتماد على هذه المرحلة';
  end if;
  if not p_approve and (p_note is null or trim(p_note) = '') then
    raise exception 'لازم توضيح سبب الرفض';
  end if;

  if p_approve and v_step_department_id is not null then
    select type into v_department_type from public.departments where id = v_step_department_id;
    if v_department_type = 'procurement' and not exists (
      select 1 from public.material_request_options where material_request_id = v_material_request_id
    ) then
      raise exception 'لازم إرفاق عرض سعر واحد على الأقل قبل اعتماد مرحلة المشتريات';
    end if;
  end if;

  update public.approval_chain_steps
  set status = case when p_approve then 'approved' else 'rejected' end,
      acted_by = auth.uid(), acted_at = now(), note = p_note
  where id = p_step_id;

  if not p_approve then
    update public.approval_chain_steps set status = 'skipped' where chain_id = v_chain_id and status = 'pending';
    update public.approval_chains set status = 'rejected', decided_at = now() where id = v_chain_id;
    update public.material_requests
    set status = case when v_phase = 'sample' then 'sample_rejected' else 'purchase_rejected' end
    where id = v_material_request_id;
  else
    select max(step_order) into v_max_order from public.approval_chain_steps where chain_id = v_chain_id;
    if v_step_order = v_max_order then
      update public.approval_chains set status = 'approved', decided_at = now() where id = v_chain_id;
      update public.material_requests
      set status = case when v_phase = 'sample' then 'sample_approved' else 'purchase_approved' end
      where id = v_material_request_id;
    end if;
  end if;
end;
$$;

grant execute on function public.review_approval_step(uuid, boolean, text) to authenticated;
