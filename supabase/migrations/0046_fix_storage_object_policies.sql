-- إصلاح ثغرة عالية الخطورة اكتُشفت أثناء تدقيق RLS: سياسات storage.objects الأربع
-- (قراءة/رفع/تعديل/حذف) على buckets: company-logos, signatures, checklist-photos,
-- documents كانت تتحقق فقط من أن bucket_id ضمن القائمة المعروفة، بدون أي تحقق من
-- مسار الملف أو الشركة — رغم أن اسمي سياستي التعديل والحذف "own storage" يوحيان
-- بتقييد المالك، لم يكن هناك أي شرط ملكية فعلي بالنص الفعلي للسياسة. النتيجة: أي
-- مستخدم مسجّل دخول من أي شركة كان يقدر يقرأ/يرفع/يعدّل/يحذف أي ملف بأي bucket من
-- الأربعة (عقود، توقيعات، صور تشيك ليست، مستندات) تخص أي شركة أخرى بالكامل.
--
-- هذا الملف يوثّق الإصلاح الذي نُفِّذ مباشرة عبر SQL Editor (السياسات الأصلية لم
-- تكن موجودة في أي migration بالمستودع أصلاً — كانت جزءاً من supabase/schema.sql
-- الذي أصبح تالفاً، فهذا أول توثيق مصدري لها).
--
-- الإصلاح: كل الرفع بالتطبيق يتبع مساراً ثابتاً ${user.id}/filename في الـ buckets
-- الأربعة كلها (تحقّق شامل عبر كل نقاط uploadFile() بالكود). لذا:
-- - القراءة: مسموحة لأي ملف مساره يبدأ بمعرّف مستخدم ينتمي لنفس شركة القارئ (لازم
--   لعرض تواقيع/مستندات الزملاء بالفريق، وليس فقط ملفات المستخدم نفسه).
-- - الرفع/التعديل/الحذف: مسموح فقط داخل مجلد المستخدم نفسه (auth.uid()).

drop policy if exists "authenticated read storage" on storage.objects;
create policy "authenticated read storage" on storage.objects
  for select using (
    bucket_id = any (array['company-logos', 'signatures', 'checklist-photos', 'documents'])
    and auth.uid() is not null
    and (storage.foldername(name))[1] in (
      select id::text from public.profiles where company_id = public.current_company_id()
    )
  );

drop policy if exists "authenticated upload storage" on storage.objects;
create policy "authenticated upload storage" on storage.objects
  for insert with check (
    bucket_id = any (array['company-logos', 'signatures', 'checklist-photos', 'documents'])
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "authenticated update own storage" on storage.objects;
create policy "authenticated update own storage" on storage.objects
  for update using (
    bucket_id = any (array['company-logos', 'signatures', 'checklist-photos', 'documents'])
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = any (array['company-logos', 'signatures', 'checklist-photos', 'documents'])
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "authenticated delete own storage" on storage.objects;
create policy "authenticated delete own storage" on storage.objects
  for delete using (
    bucket_id = any (array['company-logos', 'signatures', 'checklist-photos', 'documents'])
    and (storage.foldername(name))[1] = auth.uid()::text
  );
