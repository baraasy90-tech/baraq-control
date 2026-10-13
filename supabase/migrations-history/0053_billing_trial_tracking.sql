-- المرحلة الأولى من نظام الفوترة/التجربة المجانية: تتبّع فقط (بدون بوابة دفع فعلية
-- بعد — تُضاف لاحقاً). كل شركة جديدة تبدأ بحالة 'trial' لمدة 30 يوماً تلقائياً.
-- التحصيل والتفعيل يُدار يدوياً حالياً عبر شاشة إدارة منصة مخصصة (platform admin)
-- يصل إليها فقط حسابات مدرجة بجدول platform_admins.

alter table public.companies add column subscription_status text not null default 'trial'
  check (subscription_status in ('trial', 'active', 'expired', 'canceled'));
alter table public.companies add column trial_ends_at timestamptz not null default (now() + interval '30 days');
alter table public.companies add column subscription_note text;
alter table public.companies add column subscription_updated_by uuid references public.profiles (id) on delete set null;
alter table public.companies add column subscription_updated_at timestamptz;

-- ============================================================
-- حسابات إدارة المنصة (أنت كمشغّل SaaS، ليس مالك شركة عادي) — منفصلة تماماً عن
-- نموذج company_id الحالي، لأن مدير المنصة يحتاج رؤية كل الشركات وليس شركة واحدة.
-- ============================================================
create table public.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

create policy "platform admins read platform_admins" on public.platform_admins
  for select using (public.is_platform_admin());

grant execute on function public.is_platform_admin() to authenticated;

-- تمكين مدير المنصة من قراءة/تحديث كل الشركات لغرض الفوترة فقط (لا تمنحه وصولاً
-- لبيانات المشاريع/العقود الداخلية لأي شركة — تبقى محصورة بأعضائها كما هي).
create policy "platform admins read all companies" on public.companies
  for select using (public.is_platform_admin());

create or replace function public.set_company_subscription(
  p_company_id uuid,
  p_status text,
  p_trial_ends_at timestamptz,
  p_note text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'هذا الإجراء محصور بإدارة المنصة';
  end if;
  if p_status not in ('trial', 'active', 'expired', 'canceled') then
    raise exception 'حالة اشتراك غير صحيحة';
  end if;

  update public.companies
  set subscription_status = p_status,
      trial_ends_at = coalesce(p_trial_ends_at, trial_ends_at),
      subscription_note = p_note,
      subscription_updated_by = auth.uid(),
      subscription_updated_at = now()
  where id = p_company_id;
end;
$$;

grant execute on function public.set_company_subscription(uuid, text, timestamptz, text) to authenticated;

create or replace function public.list_all_companies_billing()
returns table (
  id uuid,
  name text,
  subscription_status text,
  trial_ends_at timestamptz,
  subscription_note text,
  subscription_updated_at timestamptz,
  created_at timestamptz,
  member_count bigint
)
language sql
security definer set search_path = public
stable
as $$
  select c.id, c.name, c.subscription_status, c.trial_ends_at, c.subscription_note,
         c.subscription_updated_at, c.created_at,
         (select count(*) from public.profiles p where p.company_id = c.id) as member_count
  from public.companies c
  where public.is_platform_admin()
  order by c.created_at desc;
$$;

grant execute on function public.list_all_companies_billing() to authenticated;

-- ============================================================
-- تفعيل حسابك كأول مدير منصة (bootstrap لمرة واحدة فقط) — استبدل البريد إن احتجت.
-- ============================================================
insert into public.platform_admins (user_id)
select id from public.profiles
where id in (select id from auth.users where email = 'www.bara@hotmail.com')
on conflict (user_id) do nothing;
