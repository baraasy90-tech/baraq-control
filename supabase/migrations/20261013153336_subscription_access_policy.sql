-- Opt-in per tenant: deploying this migration alone never freezes existing users.
create table platform_private.subscription_policy (
 company_id uuid primary key references public.companies(id) on delete cascade,
 enabled boolean not null default false,
 updated_at timestamptz not null default now(), updated_by uuid not null
);
alter table platform_private.subscription_policy enable row level security;
revoke all on platform_private.subscription_policy from public,anon,authenticated;

create function platform_private.subscription_state(p_company_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('enabled',coalesce(p.enabled,false),
  'stage',case when c.subscription_status='active' then 'active' when c.subscription_status='canceled' then 'canceled'
    when c.subscription_status='trial' and now()<c.trial_ends_at then 'trial'
    when now()<c.trial_ends_at+interval '720 hours' then 'grace' else 'read_only' end,
  'can_write',not coalesce(p.enabled,false) or c.subscription_status='active' or
    (c.subscription_status<>'canceled' and now()<c.trial_ends_at+interval '720 hours'),
  'export_notice',case when coalesce(p.enabled,false) and c.subscription_status<>'active'
    and (c.subscription_status<>'trial' or now()>=c.trial_ends_at)
    then 'انتهت الفترة التجريبية أو الاشتراك — نسخة مصدّرة من حساب غير مفعّل' else null end,
  'trial_ends_at',c.trial_ends_at,'grace_ends_at',c.trial_ends_at+interval '720 hours','server_now',now())
 from public.companies c left join platform_private.subscription_policy p on p.company_id=c.id where c.id=p_company_id;
$$;
revoke all on function platform_private.subscription_state(uuid) from public,anon,authenticated;

create function public.get_company_subscription_policy(p_company_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare own_company uuid; target uuid;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
   raise exception 'يلزم تسجيل الدخول بحساب دائم' using errcode='42501'; end if;
 select company_id into own_company from public.profiles where id=auth.uid(); target:=coalesce(p_company_id,own_company);
 if target is null or (target is distinct from own_company and not public.has_platform_admin_access()) then
   raise exception 'لا تملك صلاحية عرض سياسة هذا الحساب' using errcode='42501'; end if;
 return platform_private.subscription_state(target);
end;
$$;

create function public.set_company_subscription_policy(p_company_id uuid,p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
declare c public.companies%rowtype; was_enabled boolean;
begin
 if not public.has_platform_admin_access() then raise exception 'يتطلب الإجراء صلاحية إدارة المنصة والتحقق بخطوتين' using errcode='42501'; end if;
 if p_enabled is null then raise exception 'حدد حالة السياسة'; end if;
 select * into c from public.companies where id=p_company_id for update;
 if not found then raise exception 'الحساب غير موجود'; end if;
 select enabled into was_enabled from platform_private.subscription_policy where company_id=p_company_id;
 if coalesce(was_enabled,false)=p_enabled then return; end if;
 insert into platform_private.subscription_policy(company_id,enabled,updated_by) values(p_company_id,p_enabled,auth.uid())
  on conflict(company_id) do update set enabled=excluded.enabled,updated_by=excluded.updated_by,updated_at=now();
 insert into platform_private.subscription_audit(company_id,actor_id,previous_status,next_status,previous_ends_at,next_ends_at,note)
  values(c.id,auth.uid(),c.subscription_status,c.subscription_status,c.trial_ends_at,c.trial_ends_at,
    case when p_enabled then 'تفعيل سياسة التجربة: سماح 30 يوماً ثم قراءة فقط' else 'تعطيل سياسة التجربة والقراءة فقط' end);
end;
$$;
revoke all on function public.get_company_subscription_policy(uuid),public.set_company_subscription_policy(uuid,boolean) from public,anon;
grant execute on function public.get_company_subscription_policy(uuid),public.set_company_subscription_policy(uuid,boolean) to authenticated;

-- Resolve business ownership through an explicit finite parent map. Private and
-- inaccessible directly, this helper is used for BOTH old and new row ownership.
create function platform_private.row_company(p_table text,p_row jsonb,p_depth integer default 0)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare parent_table text; parent_key text; parent_row jsonb; result uuid;
begin
 if p_row is null or p_depth>8 then return null; end if;
 if p_table='companies' then return (p_row->>'id')::uuid; end if;
 if p_row ? 'company_id' then return (p_row->>'company_id')::uuid; end if;
 if p_row ? 'project_id' then parent_table:='projects';parent_key:='project_id';
 elsif p_row ? 'activity_id' then parent_table:='activities';parent_key:='activity_id';
 elsif p_row ? 'contract_id' then parent_table:='contracts';parent_key:='contract_id';
 elsif p_row ? 'submission_id' then parent_table:='submissions';parent_key:='submission_id';
 elsif p_row ? 'material_request_id' then parent_table:='material_requests';parent_key:='material_request_id';
 elsif p_table='documents' then parent_table:='document_folders';parent_key:='folder_id';
 elsif p_table='department_members' then parent_table:='departments';parent_key:='department_id';
 elsif p_table='approval_chain_template_steps' then parent_table:='approval_chain_templates';parent_key:='template_id';
 elsif p_table='approval_chain_steps' then parent_table:='approval_chains';parent_key:='chain_id';
 elsif p_table='internal_approval_chain_steps' then parent_table:='internal_approval_chains';parent_key:='chain_id';
 elsif p_table='internal_approval_chains' then parent_table:='internal_requests';parent_key:='internal_request_id';
 elsif p_table='internal_request_attachments' then parent_table:='internal_requests';parent_key:='request_id';
 elsif p_table='internal_request_attachment_revisions' then parent_table:='internal_request_attachments';parent_key:='attachment_id';
 else raise exception 'لم تُحدد سياسة ملكية السجل %',p_table; end if;
 execute format('select to_jsonb(p) from public.%I p where id=$1',parent_table) into parent_row using (p_row->>parent_key)::uuid;
 return platform_private.row_company(parent_table,parent_row,p_depth+1);
end;
$$;
revoke all on function platform_private.row_company(text,jsonb,integer) from public,anon,authenticated;

create function platform_private.assert_company_writable(p_company_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_company_id is null then return; end if;
 -- Serializes enabling/revoking a policy against a business transaction.
 perform 1 from public.companies where id=p_company_id for share;
 if (platform_private.subscription_state(p_company_id)->>'can_write')::boolean=false then
  raise exception 'الحساب في وضع القراءة فقط بعد انتهاء مهلة الاشتراك. يمكنك عرض بياناتك وتنزيلها؛ تواصل مع مدير المنصة للتفعيل.' using errcode='42501';
 end if;
end;
$$;
revoke all on function platform_private.assert_company_writable(uuid) from public,anon,authenticated;

create function platform_private.guard_subscription_writes()
returns trigger language plpgsql security definer set search_path='' as $$
declare old_company uuid; new_company uuid;
begin
 -- Trusted server operations without an end-user identity remain operational.
 if auth.uid() is null then if TG_OP='DELETE' then return old; else return new; end if; end if;
 if TG_TABLE_NAME='companies' and TG_OP='UPDATE' and public.has_platform_admin_access()
  and (to_jsonb(new)-array['subscription_status','trial_ends_at','subscription_note','subscription_updated_by','subscription_updated_at'])
    =(to_jsonb(old)-array['subscription_status','trial_ends_at','subscription_note','subscription_updated_by','subscription_updated_at']) then return new; end if;
 if TG_TABLE_NAME='profiles' and TG_OP='UPDATE' and (to_jsonb(new)->'company_id') is not distinct from (to_jsonb(old)->'company_id') then return new; end if;
 if TG_OP<>'INSERT' then old_company:=platform_private.row_company(TG_TABLE_NAME,to_jsonb(old));perform platform_private.assert_company_writable(old_company); end if;
 if TG_OP<>'DELETE' then new_company:=platform_private.row_company(TG_TABLE_NAME,to_jsonb(new));
  if new_company is distinct from old_company then perform platform_private.assert_company_writable(new_company); end if;
 end if;
 if TG_OP='DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function platform_private.guard_subscription_writes() from public,anon,authenticated;
DO $guards$ declare t text; begin
 foreach t in array array['companies','profiles','projects','activities','departments','department_members','project_members','invites',
 'company_holidays','custom_calendars','employees','job_titles','organizational_levels','organizational_classifications',
 'tasks','document_folders','documents','contracts','contract_line_items','contract_payments','contract_extra_works','contract_deductions',
 'budget_actual_entries','budget_reconciliation_notes','checklist_items','checklist_results','submissions','submission_images',
 'material_requests','material_request_options','material_request_attachments','approval_chain_templates','approval_chain_template_steps',
 'approval_chains','approval_chain_steps','internal_requests','internal_request_attachments','internal_request_attachment_revisions',
 'internal_approval_chains','internal_approval_chain_steps'] loop
 execute format('create trigger guard_subscription_writes before insert or update or delete on public.%I for each row execute function platform_private.guard_subscription_writes()',t);
 end loop;
end $guards$;

create function platform_private.guard_storage_subscription_writes()
returns trigger language plpgsql security definer set search_path='' as $$
declare c uuid;
begin
 if auth.uid() is not null then
  select company_id into c from public.profiles where id=auth.uid();perform platform_private.assert_company_writable(c);
  if TG_OP<>'INSERT' then select company_id into c from public.profiles where id::text=coalesce(old.owner_id,old.owner::text);
   perform platform_private.assert_company_writable(c); end if;
 end if;
 if TG_OP='DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function platform_private.guard_storage_subscription_writes() from public,anon,authenticated;
create trigger guard_storage_subscription_writes before insert or update or delete on storage.objects
 for each row execute function platform_private.guard_storage_subscription_writes();
notify pgrst,'reload schema';
