-- رمز دولة الشركة (ISO 3166-1 alpha-2) — يُستخدم لجلب الأعياد الرسمية الصحيحة.
alter table public.companies add column country_code text not null default 'SA';
