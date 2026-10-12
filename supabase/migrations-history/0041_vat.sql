-- ضريبة القيمة المضافة: نسبة مركزية واحدة بالشركة (قابلة للتعديل من لوحة التحكم
-- في أي وقت حسب توجهات الدولة)، وعلى مستوى كل عقد: هل القيمة المُدخلة شاملة
-- الضريبة أو غير شاملة، بالإضافة لنسخة محفوظة من نسبة الضريبة وقت حفظ العقد حتى
-- لا يتغيّر حساب عقد قائم تلقائياً إن غيّرت الشركة نسبتها المركزية لاحقاً.

alter table public.companies add column vat_rate numeric not null default 15;

alter table public.contracts add column vat_inclusive boolean not null default false;
alter table public.contracts add column vat_rate numeric;
