-- نفس خلل الغموض اللي أُصلح سابقاً بـ join_company_by_code (هجرة 0020) كان موجوداً هنا أيضاً
-- ولم يُصلح: أسماء أعمدة RETURNS TABLE تطابقت حرفياً مع عمود profiles.company_id، فصار
-- المرجع غامضاً عند تنفيذ UPDATE داخل الدالة. الحل: تسمية مخرجات الدالة بأسماء مختلفة تماماً.

drop function if exists public.accept_invite(text);

create or replace function public.accept_invite(p_token text)
returns table (result_company_id uuid, result_company_name text, result_department_id uuid, result_role text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_invite record;
begin
  select * into v_invite from public.invites where token = p_token and status = 'pending' and expires_at > now();
  if not found then
    raise exception 'رابط الدعوة غير صالح أو منتهي الصلاحية';
  end if;

  if lower(v_invite.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'هذه الدعوة مرسلة لبريد إلكتروني مختلف عن حسابك الحالي';
  end if;

  update public.profiles set company_id = v_invite.company_id where id = auth.uid();

  insert into public.department_members (department_id, user_id, role)
  values (v_invite.department_id, auth.uid(), v_invite.role)
  on conflict (department_id, user_id) do update set role = excluded.role;

  update public.invites set status = 'accepted' where id = v_invite.id;

  return query select c.id, c.name, v_invite.department_id, v_invite.role from public.companies c where c.id = v_invite.company_id;
end;
$$;

grant execute on function public.accept_invite(text) to authenticated;
