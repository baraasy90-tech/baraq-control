-- محرر رسم حر للهيكلة: كل قسم يحتفظ بموقعه X/Y بالضبط على لوحة الرسم (وليس فقط
-- من يتبع لمن)، يحدَّث عند سحب المستخدم للصندوق يدوياً.

alter table public.departments add column position_x numeric;
alter table public.departments add column position_y numeric;
