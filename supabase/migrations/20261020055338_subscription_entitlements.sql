-- Admin-only contractual records; no automatic provider upgrade or quota enforcement.
create table platform_private.subscription_entitlements (
 company_id uuid primary key references public.companies(id) on delete cascade,
 package_name text check(package_name is null or char_length(package_name)<=100),
 max_file_mib integer check(max_file_mib>0), storage_gib integer check(storage_gib>0),
 annual_transfer_gib integer check(annual_transfer_gib>0), max_users integer check(max_users>0),
 revision integer not null check(revision>0), updated_at timestamptz not null default now(), updated_by uuid not null,
 check(max_file_mib is null or storage_gib is null or max_file_mib::bigint<=storage_gib::bigint*1024)
);
create table platform_private.entitlement_audit (
 id bigint generated always as identity primary key,company_id uuid not null,actor_id uuid not null,
 changed_at timestamptz not null default now(),previous_values jsonb,next_values jsonb not null
);
alter table platform_private.subscription_entitlements enable row level security;
alter table platform_private.entitlement_audit enable row level security;
create index entitlement_audit_history on platform_private.entitlement_audit(company_id,id desc);
revoke all on table platform_private.subscription_entitlements,platform_private.entitlement_audit from public,anon,authenticated;

create function public.get_company_entitlements(p_company_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not coalesce(public.has_platform_admin_access(),false) or exists(select 1 from auth.users where id=auth.uid() and banned_until>now()) then
  raise exception 'إدارة الباقات تتطلب حساباً مخولاً والتحقق بخطوتين' using errcode='42501';end if;
 if not exists(select 1 from public.companies where id=p_company_id) then raise exception 'الحساب المطلوب غير موجود';end if;
 return jsonb_build_object('current',(select to_jsonb(e) from platform_private.subscription_entitlements e where company_id=p_company_id),
  'history',coalesce((select jsonb_agg(to_jsonb(a) order by a.id desc) from (select * from platform_private.entitlement_audit where company_id=p_company_id order by id desc limit 30)a),'[]'::jsonb));
end;$$;

create function public.set_company_entitlements(p_company_id uuid,p_package_name text,p_max_file_mib integer,p_storage_gib integer,p_annual_transfer_gib integer,p_max_users integer,p_expected_revision integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare previous platform_private.subscription_entitlements%rowtype; saved platform_private.subscription_entitlements%rowtype; clean_name text:=nullif(btrim(p_package_name),'');
begin
 if not coalesce(public.has_platform_admin_access(),false) or exists(select 1 from auth.users where id=auth.uid() and banned_until>now()) then
  raise exception 'إدارة الباقات تتطلب حساباً مخولاً والتحقق بخطوتين' using errcode='42501';end if;
 if p_expected_revision is null or p_expected_revision<0 then raise exception 'رقم نسخة الحدود غير صالح';end if;
 if length(clean_name)>100 then raise exception 'اسم الباقة لا يتجاوز 100 حرف';end if;
 if p_max_file_mib<=0 or p_storage_gib<=0 or p_annual_transfer_gib<=0 or p_max_users<=0 then raise exception 'الحدود أعداد صحيحة موجبة؛ اترك غير المحدد فارغاً';end if;
 if p_max_file_mib::bigint>p_storage_gib::bigint*1024 then raise exception 'حجم الملف لا يمكن أن يتجاوز المساحة الإجمالية';end if;
 perform 1 from public.companies where id=p_company_id for update;
 if not found then raise exception 'الحساب المطلوب غير موجود';end if;
 select * into previous from platform_private.subscription_entitlements where company_id=p_company_id for update;
 -- Exact retry after a lost response does not overwrite anything or duplicate the audit.
 if previous.company_id is not null and row(previous.package_name,previous.max_file_mib,previous.storage_gib,previous.annual_transfer_gib,previous.max_users)
  is not distinct from row(clean_name,p_max_file_mib,p_storage_gib,p_annual_transfer_gib,p_max_users) then return to_jsonb(previous);end if;
 if coalesce(previous.revision,0)<>p_expected_revision then raise exception 'تغيرت حدود الباقة. أعد تحميل الحدود قبل حفظ تعديل جديد' using errcode='40001';end if;
 insert into platform_private.subscription_entitlements(company_id,package_name,max_file_mib,storage_gib,annual_transfer_gib,max_users,revision,updated_by)
 values(p_company_id,clean_name,p_max_file_mib,p_storage_gib,p_annual_transfer_gib,p_max_users,coalesce(previous.revision,0)+1,auth.uid())
 on conflict(company_id) do update set package_name=excluded.package_name,max_file_mib=excluded.max_file_mib,storage_gib=excluded.storage_gib,annual_transfer_gib=excluded.annual_transfer_gib,max_users=excluded.max_users,revision=excluded.revision,updated_at=now(),updated_by=auth.uid()
 returning * into saved;
 insert into platform_private.entitlement_audit(company_id,actor_id,previous_values,next_values)
 values(p_company_id,auth.uid(),case when previous.company_id is null then null else to_jsonb(previous) end,to_jsonb(saved));
 return to_jsonb(saved);
end;$$;
revoke all on function public.get_company_entitlements(uuid),public.set_company_entitlements(uuid,text,integer,integer,integer,integer,integer) from public,anon;
grant execute on function public.get_company_entitlements(uuid),public.set_company_entitlements(uuid,text,integer,integer,integer,integer,integer) to authenticated;
