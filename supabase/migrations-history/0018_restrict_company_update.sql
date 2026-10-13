-- بيانات الشركة (الاسم، الشعار، الأرشفة، الطباعة) يجب أن يعدّلها فقط مالك
-- الشركة أو الإدارة التنفيذية — وليس أي عضو بالشركة كما كانت الحالة سابقاً.

drop policy if exists "update own company" on public.companies;
create policy "org managers update company" on public.companies
  for update using (public.can_manage_org(id));
