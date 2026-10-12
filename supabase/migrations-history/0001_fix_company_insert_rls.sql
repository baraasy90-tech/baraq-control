-- إصلاح: إنشاء شركة جديدة أثناء الإعداد الأولي كان يفشل بخطأ RLS
-- السبب: INSERT ... RETURNING يتطلب أن تنطبق سياسة SELECT على الصف الجديد فوراً،
-- لكن profiles.company_id لسه فاضي في تلك اللحظة، فسياسة "id = current_company_id()" ترفضه.
-- الحل: عمود created_by + شرط إضافي بسياسة SELECT/UPDATE.
-- شغّل هذا الملف في SQL Editor (مرة واحدة فقط، فوق قاعدة سبق أن شغّلت عليها schema.sql).

alter table public.companies
  add column if not exists created_by uuid references auth.users (id) on delete cascade;

update public.companies c
set created_by = p.id
from public.profiles p
where p.company_id = c.id
  and c.created_by is null;

alter table public.companies
  alter column created_by set default auth.uid();

drop policy if exists "read own company" on public.companies;
create policy "read own company" on public.companies
  for select using (id = public.current_company_id() or created_by = auth.uid());

drop policy if exists "update own company" on public.companies;
create policy "update own company" on public.companies
  for update using (id = public.current_company_id());
