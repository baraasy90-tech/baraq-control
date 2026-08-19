-- تعميم "طلباتي": كانت مقصورة على الموارد البشرية، والآن يمكن توجيه أي طلب لأي قسم
-- (مالية، إدارة عليا، مشتريات، موارد بشرية...)، مع إمكانية تحديد شخص بعينه داخل
-- القسم، وإرفاق ملف. من يملك صلاحية الرد: الشخص المحدد تحديداً (إن وُجد)، أو أي
-- رئيس قسم للقسم المستهدف، أو مدير الحساب/الإدارة التنفيذية دائماً.

alter table public.hr_requests rename to internal_requests;

alter table public.internal_requests add column department_id uuid references public.departments (id) on delete set null;
alter table public.internal_requests add column target_user_id uuid references public.profiles (id) on delete set null;
alter table public.internal_requests add column attachment_url text;

-- الطلبات القديمة كانت كلها ضمنياً للموارد البشرية — نربطها بقسم HR إن وُجد بنفس الشركة.
update public.internal_requests r
set department_id = (
  select d.id from public.departments d where d.company_id = r.company_id and d.type = 'hr' limit 1
)
where department_id is null;

alter table public.internal_requests alter column type drop not null;

drop policy "hr reads company hr_requests" on public.internal_requests;

create or replace function public.can_review_request(p_request_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_company_id uuid;
  v_department_id uuid;
  v_target_user_id uuid;
begin
  select company_id, department_id, target_user_id into v_company_id, v_department_id, v_target_user_id
  from public.internal_requests where id = p_request_id;

  if v_company_id is null then
    return false;
  end if;

  if public.can_manage_org(v_company_id) then
    return true;
  end if;

  if v_target_user_id is not null and v_target_user_id = auth.uid() then
    return true;
  end if;

  if v_department_id is not null and exists (
    select 1 from public.department_members dm
    where dm.department_id = v_department_id and dm.user_id = auth.uid() and dm.role = 'head'
  ) then
    return true;
  end if;

  return false;
end;
$$;

create policy "reviewers read internal_requests" on public.internal_requests
  for select using (public.can_review_request(id));

create or replace function public.review_internal_request(p_request_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from public.internal_requests where id = p_request_id;
  if v_status is null then
    raise exception 'الطلب غير موجود';
  end if;
  if not public.can_review_request(p_request_id) then
    raise exception 'لا تملك صلاحية الرد على هذا الطلب';
  end if;
  if v_status <> 'pending' then
    raise exception 'هذا الطلب ليس بانتظار رد حالياً';
  end if;

  update public.internal_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note
  where id = p_request_id;
end;
$$;

grant execute on function public.review_internal_request(uuid, boolean, text) to authenticated;

drop function if exists public.review_hr_request(uuid, boolean, text);
drop function if exists public.can_hr_approve_company(uuid);
