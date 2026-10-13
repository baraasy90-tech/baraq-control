-- Platform operations require a permanent, explicitly allowlisted account and MFA.
-- Do not add administrators automatically by email or by customer ownership.
create schema if not exists platform_private;
revoke all on schema platform_private from public, anon, authenticated;
revoke insert,update,delete,truncate,references,trigger on public.platform_admins from public,anon,authenticated;

-- Company branding remains editable, but subscription fields cannot be changed
-- through a direct Data API PATCH, even by an MFA platform administrator.
create function platform_private.guard_subscription_fields()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if current_user in ('authenticated','anon') and
    row(new.subscription_status,new.trial_ends_at,new.subscription_note,new.subscription_updated_by,new.subscription_updated_at)
      is distinct from
    row(old.subscription_status,old.trial_ends_at,old.subscription_note,old.subscription_updated_by,old.subscription_updated_at) then
    raise exception 'تعديل الاشتراك متاح عبر إدارة المنصة فقط' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function platform_private.guard_subscription_fields() from public,anon,authenticated;
create trigger guard_company_subscription before update on public.companies
  for each row execute function platform_private.guard_subscription_fields();

create table platform_private.subscription_audit (
  id bigint generated always as identity primary key,
  company_id uuid not null,
  actor_id uuid not null,
  changed_at timestamptz not null default now(),
  previous_status text not null,
  next_status text not null,
  previous_ends_at timestamptz not null,
  next_ends_at timestamptz not null,
  note text
);
alter table platform_private.subscription_audit enable row level security;
create index subscription_audit_company_history on platform_private.subscription_audit(company_id,id desc);
revoke all on table platform_private.subscription_audit from public, anon, authenticated;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and not coalesce((auth.jwt()->>'is_anonymous')::boolean, false)
    and exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

create function public.has_platform_admin_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_platform_admin() and coalesce(auth.jwt()->>'aal', '') = 'aal2';
$$;
revoke all on function public.has_platform_admin_access() from public, anon;
grant execute on function public.has_platform_admin_access() to authenticated;

alter policy "platform admins read all companies" on public.companies
  to authenticated using (public.has_platform_admin_access());
alter policy "platform admins read platform_admins" on public.platform_admins
  to authenticated using (public.has_platform_admin_access());

create or replace function public.list_all_companies_billing()
returns table(id uuid,name text,subscription_status text,trial_ends_at timestamptz,subscription_note text,subscription_updated_at timestamptz,created_at timestamptz,member_count bigint,is_individual boolean)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.has_platform_admin_access() then
    raise exception 'إدارة المنصة تتطلب حساباً مخولاً والتحقق بخطوتين' using errcode='42501';
  end if;
  return query select c.id,c.name,c.subscription_status,c.trial_ends_at,c.subscription_note,c.subscription_updated_at,c.created_at,
    (select count(*) from public.profiles p where p.company_id=c.id),c.is_individual
    from public.companies c order by c.created_at desc, c.id;
end;
$$;

create or replace function public.set_company_subscription(
  p_company_id uuid, p_status text, p_trial_ends_at timestamptz, p_note text
) returns void language plpgsql security definer set search_path='' as $$
declare previous public.companies%rowtype;
begin
  if not public.has_platform_admin_access() then
    raise exception 'إدارة المنصة تتطلب حساباً مخولاً والتحقق بخطوتين' using errcode='42501';
  end if;
  if p_status is null or p_status not in ('trial','active','expired','canceled') then
    raise exception 'حالة اشتراك غير صحيحة';
  end if;
  if p_trial_ends_at is not null and not isfinite(p_trial_ends_at) then
    raise exception 'تاريخ انتهاء غير صحيح';
  end if;
  if length(p_note) > 2000 then raise exception 'الملاحظة أطول من الحد المسموح'; end if;
  select * into previous from public.companies where id=p_company_id for update;
  if not found then raise exception 'الحساب المطلوب غير موجود'; end if;
  update public.companies set subscription_status=p_status,
    trial_ends_at=coalesce(p_trial_ends_at,previous.trial_ends_at),
    subscription_note=nullif(btrim(p_note),''), subscription_updated_by=auth.uid(),subscription_updated_at=now()
    where id=p_company_id;
  insert into platform_private.subscription_audit(company_id,actor_id,previous_status,next_status,previous_ends_at,next_ends_at,note)
    values(p_company_id,auth.uid(),previous.subscription_status,p_status,previous.trial_ends_at,
      coalesce(p_trial_ends_at,previous.trial_ends_at),nullif(btrim(p_note),''));
end;
$$;

create function public.list_subscription_audit(p_company_id uuid)
returns table(id bigint,changed_at timestamptz,previous_status text,next_status text,previous_ends_at timestamptz,next_ends_at timestamptz,note text)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.has_platform_admin_access() then
    raise exception 'إدارة المنصة تتطلب حساباً مخولاً والتحقق بخطوتين' using errcode='42501';
  end if;
  return query select a.id,a.changed_at,a.previous_status,a.next_status,a.previous_ends_at,a.next_ends_at,a.note
    from platform_private.subscription_audit a where a.company_id=p_company_id
    order by a.id desc limit 100;
end;
$$;
revoke all on function public.is_platform_admin(),public.list_all_companies_billing(),public.set_company_subscription(uuid,text,timestamptz,text),public.list_subscription_audit(uuid) from public,anon;
grant execute on function public.is_platform_admin(),public.list_all_companies_billing(),public.set_company_subscription(uuid,text,timestamptz,text),public.list_subscription_audit(uuid) to authenticated;
notify pgrst,'reload schema';
