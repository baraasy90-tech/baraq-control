-- إصلاح نهائي لخطأ حفظ شاشة الأرشفة/الإعدادات: PGRST204 "Could not find the
-- 'vat_rate' column of 'companies' in the schema cache". هذا الملف idempotent
-- بالكامل (آمن التكرار) ويعالج كلا السببين المحتملين معاً بضربة واحدة:
-- 1) لو كان العمود فعلاً غير موجود (احتمال ضعيف لكن وارد) — يُنشأ الآن بنفس تعريفه
--    الأصلي من 0041_vat.sql دون أي تأثير على القيم الحالية.
-- 2) لو كان العمود موجوداً لكن ذاكرة التخزين المؤقت لمخطط PostgREST لم تتحدّث بعد
--    (وهو الأرجح، لأن VAT يعمل بمكان آخر بالتطبيق) — نجبر إعادة التحميل صراحة.

alter table public.companies add column if not exists vat_rate numeric not null default 15;

notify pgrst, 'reload schema';
