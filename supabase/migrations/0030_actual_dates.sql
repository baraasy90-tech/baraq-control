-- تتبع المسار الفعلي مقابل النظري لكل بند — تاريخ بداية فعلي (يُسجَّل بضغطة زر "بدء الآن" أو
-- يدوياً) وتاريخ انتهاء فعلي (يُسجَّل تلقائياً عند التحديد كمنجز، أو عند اعتماد الاستلام
-- النهائي للبنود التي تتطلب استلاماً)، لعرض شريط ثانٍ بالجدول الزمني بلون يعكس التأخر/التقدّم.
alter table public.activities add column actual_start_date date;
alter table public.activities add column actual_end_date date;
