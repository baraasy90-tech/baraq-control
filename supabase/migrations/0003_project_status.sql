-- إضافة حالة المشروع (تحت التجهيز / قائم / منتهٍ) لتصنيف لوحة المشاريع
-- شغّل هذا الملف في SQL Editor فوق قاعدة سبق أن شغّلت عليها schema.sql

alter table public.projects
  add column if not exists status text not null default 'preparing'
  check (status in ('preparing', 'active', 'completed'));
