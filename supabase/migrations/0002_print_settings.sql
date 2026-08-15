-- إضافة إعدادات الطباعة (رأس/تذييل رسمي أو قالب صفحة كاملة + هوامش) لجدول الشركات
-- شغّل هذا الملف في SQL Editor فوق قاعدة سبق أن شغّلت عليها schema.sql

alter table public.companies
  add column if not exists print_mode text not null default 'none' check (print_mode in ('none', 'header_footer', 'full_page')),
  add column if not exists print_header_url text,
  add column if not exists print_footer_url text,
  add column if not exists print_full_page_url text,
  add column if not exists print_margin_top numeric not null default 20,
  add column if not exists print_margin_bottom numeric not null default 20,
  add column if not exists print_margin_left numeric not null default 15,
  add column if not exists print_margin_right numeric not null default 15;
