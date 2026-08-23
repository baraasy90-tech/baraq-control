-- إضافة حقول توصيف الطلب اللي طلبها المستخدم بعد أول تجربة فعلية: الكمية الكلية
-- المطلوبة من المشتريات، سعر الوحدة المستهدف (اختياري، مرجعي لرافع الطلب)، وموعد الحاجة
-- لاستلام العروض (يساعد قسم المشتريات يرتّب أولوياته).

alter table public.material_requests add column quantity numeric;
alter table public.material_requests add column target_unit_price numeric;
alter table public.material_requests add column needed_by date;
