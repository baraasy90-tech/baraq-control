-- إضافة لون مخصّص للرأس العلوي بلوحة المشاريع
-- شغّل هذا الملف في SQL Editor فوق قاعدة سبق أن شغّلت عليها schema.sql

alter table public.companies
  add column if not exists header_color text not null default '#171B26';
