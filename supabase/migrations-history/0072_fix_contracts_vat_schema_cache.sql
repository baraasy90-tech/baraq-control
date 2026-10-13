-- نفس خلل ذاكرة تخزين PostgREST المؤقتة (schema cache) الذي واجهناه سابقاً مع
-- companies.vat_rate (migration 0058) — يتكرر الآن مع عمودي vat_inclusive/vat_rate
-- بجدول contracts (أُضيفا معاً بنفس migration 0041، فمن المرجّح أن ذاكرة PostgREST
-- لم تُحدَّث لأي منهما أصلاً). الحل نفسه: إعادة تعريف العمودين بأمان (idempotent) ثم
-- إجبار PostgREST على إعادة تحميل مخطط قاعدة البيانات.

alter table public.contracts add column if not exists vat_inclusive boolean not null default false;
alter table public.contracts add column if not exists vat_rate numeric;

notify pgrst, 'reload schema';
