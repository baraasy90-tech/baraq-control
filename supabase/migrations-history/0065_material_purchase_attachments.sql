-- "مرفقات خاصة مطلوبة" بمرحلة الشراء الرسمي كانت مجرد خانة نص وصفي (بدون أي إمكانية
-- رفع ملف فعلي)، ما أوهم المستخدم بوجود مرفق فعلي رغم عدم وجوده. نضيف عمود phase
-- لجدول material_request_attachments (الموجود أصلاً ويُستخدم لمرفقات المرحلة 1) لنفرّق
-- مرفقات "طلب المادة الأولي" عن مرفقات "الشراء الرسمي" (عرض السعر، شهادة المطابقة...)
-- بنفس مصطلح phase المستخدم أصلاً بجدول approval_chains لهذا الطلب بالذات.

alter table public.material_request_attachments
  add column if not exists phase text not null default 'sample' check (phase in ('sample', 'purchase'));
