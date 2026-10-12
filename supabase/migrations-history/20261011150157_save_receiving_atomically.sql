-- One database transaction for the submission, checklist, images and completion date.
-- SECURITY INVOKER keeps existing RLS policies active for every statement.
create or replace function public.save_receiving_submission(
  p_submission_id uuid, p_activity_id uuid, p_create boolean,
  p_manager_name text, p_manager_signature_url text, p_decision text, p_notes text,
  p_results jsonb, p_images text[]
) returns public.submissions
language plpgsql security invoker set search_path = '' as $$
declare
  v_submission public.submissions;
  v_activity public.activities;
  v_results jsonb;
  v_saved_results jsonb;
  v_images text[];
  v_saved_images text[];
  v_exists boolean;
begin
  if auth.uid() is null then
    raise exception 'يلزم تسجيل الدخول' using errcode = '42501';
  end if;
  if p_submission_id is null or p_activity_id is null or p_create is null then
    raise exception 'معرّف التقديم أو النشاط غير صالح';
  end if;
  select * into v_activity from public.activities where id = p_activity_id for update;
  if not found or not public.can_access_project(v_activity.project_id) then
    raise exception 'النشاط غير موجود أو لا تملك صلاحية الوصول' using errcode = '42501';
  end if;
  if nullif(trim(p_manager_name), '') is null or nullif(trim(p_manager_signature_url), '') is null then
    raise exception 'يلزم اسم المدير وتوقيعه';
  end if;
  if p_decision is null or p_decision not in ('approved', 'approvedWithNotes', 'rejected') then
    raise exception 'قرار الاستلام غير صالح';
  end if;
  if p_results is null or jsonb_typeof(p_results) <> 'array' or p_images is null then
    raise exception 'نتائج الاستلام والصور غير صالحة';
  end if;

  -- Validate the whole payload before replacing any existing child rows.
  if exists (
    select 1 from pg_catalog.jsonb_to_recordset(p_results)
      as r(checklist_item_id uuid, checked boolean, image_url text)
    left join public.checklist_items ci on ci.id = r.checklist_item_id and ci.activity_id = p_activity_id
    where ci.id is null or r.checked is null
      or (ci.photo_required and nullif(trim(r.image_url), '') is null)
  ) or (select count(*) from pg_catalog.jsonb_to_recordset(p_results) as r(checklist_item_id uuid))
       <> (select count(distinct r.checklist_item_id) from pg_catalog.jsonb_to_recordset(p_results) as r(checklist_item_id uuid))
     or jsonb_array_length(p_results) <> (select count(*) from public.checklist_items where activity_id = p_activity_id)
  then
    raise exception 'قائمة الاستلام ناقصة أو تحتوي بنداً من نشاط آخر أو صورة مطلوبة مفقودة';
  end if;
  if exists(select 1 from unnest(p_images) u(url) where nullif(trim(u.url), '') is null) then
    raise exception 'رابط صورة الاستلام غير صالح';
  end if;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.checklist_item_id), '[]'::jsonb)
  into v_results from pg_catalog.jsonb_to_recordset(p_results)
    as r(checklist_item_id uuid, checked boolean, image_url text);
  select coalesce(array_agg(url order by url), array[]::text[]) into v_images from unnest(p_images) u(url);

  select * into v_submission from public.submissions where id = p_submission_id for update;
  v_exists := found;
  if v_exists and v_submission.activity_id <> p_activity_id then
    raise exception 'لا يمكن نقل تقديم استلام إلى نشاط آخر' using errcode = '42501';
  end if;

  if p_create and v_exists then
    select coalesce(jsonb_agg(jsonb_build_object('checklist_item_id', checklist_item_id, 'checked', checked, 'image_url', image_url)
      order by checklist_item_id), '[]'::jsonb)
    into v_saved_results from public.checklist_results where submission_id = p_submission_id;
    select coalesce(array_agg(image_url order by image_url), array[]::text[])
    into v_saved_images from public.submission_images where submission_id = p_submission_id;
    if v_submission.manager_name is distinct from trim(p_manager_name)
       or v_submission.manager_signature_url is distinct from p_manager_signature_url
       or v_submission.decision is distinct from p_decision
       or v_submission.notes is distinct from p_notes
       or v_saved_results is distinct from v_results or v_saved_images is distinct from v_images then
      raise exception 'سبق حفظ هذا التقديم ببيانات مختلفة. أغلق النموذج وحدّث قائمة الاستلام قبل المتابعة';
    end if;
    return v_submission; -- Idempotent retry of the same form payload.
  elsif p_create then
    insert into public.submissions(id, activity_id, manager_name, manager_signature_url, decision, notes)
    values(p_submission_id, p_activity_id, trim(p_manager_name), p_manager_signature_url, p_decision, p_notes)
    returning * into v_submission;
  else
    if not v_exists then
      raise exception 'التقديم غير موجود أو لا تملك صلاحية تعديله' using errcode = '42501';
    end if;
    update public.submissions set manager_name = trim(p_manager_name),
      manager_signature_url = p_manager_signature_url, decision = p_decision, notes = p_notes
    where id = p_submission_id returning * into v_submission;
    if not found then
      raise exception 'لم يتم تعديل التقديم' using errcode = '42501';
    end if;
    delete from public.checklist_results where submission_id = p_submission_id;
    delete from public.submission_images where submission_id = p_submission_id;
  end if;

  insert into public.checklist_results(submission_id, checklist_item_id, checked, image_url)
  select p_submission_id, r.checklist_item_id, r.checked, r.image_url
  from pg_catalog.jsonb_to_recordset(p_results) as r(checklist_item_id uuid, checked boolean, image_url text);
  insert into public.submission_images(submission_id, image_url)
  select p_submission_id, u.url from unnest(p_images) u(url);

  if p_decision = 'approved' then
    update public.activities set actual_end_date = coalesce(actual_end_date, (now() at time zone 'Asia/Riyadh')::date)
    where id = p_activity_id;
    if not found then
      raise exception 'لم يتم تسجيل تاريخ انتهاء النشاط' using errcode = '42501';
    end if;
  end if;
  return v_submission;
end;
$$;
revoke all on function public.save_receiving_submission(uuid, uuid, boolean, text, text, text, text, jsonb, text[]) from public, anon;
grant execute on function public.save_receiving_submission(uuid, uuid, boolean, text, text, text, text, jsonb, text[]) to authenticated;
notify pgrst, 'reload schema';
