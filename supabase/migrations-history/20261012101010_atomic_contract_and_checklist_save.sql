create or replace function public.save_contract_atomic(p_id uuid,p_create boolean,p_reset_to_draft boolean,p_data jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_existing public.contracts; v_next public.contracts; v_found boolean; begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'يلزم حساب مسجل' using errcode='42501'; end if;
 if p_id is null or p_create is null or p_reset_to_draft is null or p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'بيانات العقد غير صالحة'; end if;
 if exists(select 1 from jsonb_object_keys(p_data) k where k not in ('project_id','contract_name','pdf_url','start_date','duration_days','total_value','payment_terms','has_advance_payment','advance_payment_percentage','advance_payment_guarantee_note','advance_deduction_percentage','retention_percentage','retention_released','retention_release_note','vat_inclusive','vat_rate')) then raise exception 'حقول غير مسموحة في العقد'; end if;
 if nullif(trim(p_data->>'contract_name'),'') is null or nullif(p_data->>'project_id','') is null then raise exception 'يلزم اسم العقد والمشروع'; end if;
 perform 1 from public.projects where id=(p_data->>'project_id')::uuid for update;
 if not found or not public.can_access_project((p_data->>'project_id')::uuid) then raise exception 'لا تملك صلاحية المشروع' using errcode='42501'; end if;
 select * into v_existing from public.contracts where id=p_id for update;v_found:=found;
 if v_found and p_create then
  if to_jsonb(v_existing) @> p_data then return p_id; end if;
  raise exception 'سبق حفظ هذا العقد ببيانات مختلفة؛ حدّث القائمة';
 end if;
 if not v_found and not p_create then raise exception 'العقد غير موجود أو لا تملك صلاحية الوصول' using errcode='42501'; end if;
 if v_found and v_existing.project_id<>(p_data->>'project_id')::uuid then raise exception 'لا يمكن نقل العقد إلى مشروع آخر'; end if;
 select * into v_next from jsonb_populate_record(v_existing,p_data);
 if v_found then
  if p_reset_to_draft then perform public.reset_contract_to_draft(p_id); end if;
  update public.contracts set contract_name=v_next.contract_name,pdf_url=v_next.pdf_url,start_date=v_next.start_date,duration_days=v_next.duration_days,total_value=v_next.total_value,payment_terms=v_next.payment_terms,has_advance_payment=v_next.has_advance_payment,advance_payment_percentage=v_next.advance_payment_percentage,advance_payment_guarantee_note=v_next.advance_payment_guarantee_note,advance_deduction_percentage=v_next.advance_deduction_percentage,retention_percentage=v_next.retention_percentage,retention_released=v_next.retention_released,retention_release_note=v_next.retention_release_note,vat_inclusive=v_next.vat_inclusive,vat_rate=v_next.vat_rate where id=p_id;
  if not found then raise exception 'تعذّر تحديث العقد'; end if;
 else
  insert into public.contracts(id,project_id,contract_name,pdf_url,start_date,duration_days,total_value,payment_terms,has_advance_payment,advance_payment_percentage,advance_payment_guarantee_note,advance_deduction_percentage,retention_percentage,retention_released,retention_release_note,vat_inclusive,vat_rate)
  values(p_id,v_next.project_id,v_next.contract_name,v_next.pdf_url,v_next.start_date,v_next.duration_days,v_next.total_value,v_next.payment_terms,coalesce(v_next.has_advance_payment,false),v_next.advance_payment_percentage,v_next.advance_payment_guarantee_note,v_next.advance_deduction_percentage,v_next.retention_percentage,coalesce(v_next.retention_released,false),v_next.retention_release_note,coalesce(v_next.vat_inclusive,false),v_next.vat_rate);
 end if;
 return p_id;
end;
$$;
revoke all on function public.save_contract_atomic(uuid,boolean,boolean,jsonb) from public,anon;
grant execute on function public.save_contract_atomic(uuid,boolean,boolean,jsonb) to authenticated;

create or replace function public.save_checklist_atomic(p_activity_id uuid,p_items jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare v_activity public.activities;v_item record; begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'يلزم حساب مسجل' using errcode='42501'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'قائمة الاستلام غير صالحة'; end if;
 select * into v_activity from public.activities where id=p_activity_id for update;
 if not found or not public.can_access_project(v_activity.project_id) then raise exception 'لا تملك صلاحية النشاط' using errcode='42501'; end if;
 if exists(select 1 from jsonb_to_recordset(p_items) as i(id uuid,text text,photo_required boolean,"order" integer) where i.id is null or nullif(trim(i.text),'') is null or i.photo_required is null or i."order" is null) then raise exception 'بيانات بند غير صالحة'; end if;
 if (select count(*)<>count(distinct i.id) from jsonb_to_recordset(p_items) as i(id uuid)) then raise exception 'بند مكرر في القائمة'; end if;
 if exists(select 1 from public.checklist_items c join jsonb_to_recordset(p_items) as i(id uuid) on i.id=c.id where c.activity_id<>p_activity_id) then raise exception 'بند تابع لنشاط آخر'; end if;
 if exists(select 1 from public.checklist_items c join public.checklist_results r on r.checklist_item_id=c.id where c.activity_id=p_activity_id and not exists(select 1 from jsonb_to_recordset(p_items) as i(id uuid) where i.id=c.id)) then raise exception 'لا يمكن حذف بند مستخدم في تقديم استلام سابق'; end if;
 delete from public.checklist_items c where c.activity_id=p_activity_id and not exists(select 1 from jsonb_to_recordset(p_items) as i(id uuid) where i.id=c.id);
 for v_item in select * from jsonb_to_recordset(p_items) as i(id uuid,text text,photo_required boolean,"order" integer) loop
  insert into public.checklist_items(id,activity_id,text,photo_required,"order") values(v_item.id,p_activity_id,v_item.text,v_item.photo_required,v_item."order") on conflict(id) do update set text=excluded.text,photo_required=excluded.photo_required,"order"=excluded."order" where public.checklist_items.activity_id=p_activity_id;
  if not found then raise exception 'تعذّر حفظ بند الاستلام'; end if;
 end loop;
end;
$$;
revoke all on function public.save_checklist_atomic(uuid,jsonb) from public,anon;
grant execute on function public.save_checklist_atomic(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
