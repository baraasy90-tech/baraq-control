-- تمييز أي دفعة بأنها "الدفعة المقدمة" نفسها، حتى نستثنيها من حساب خصم
-- الاسترداد وخصم ضمان الأعمال عند احتساب صافي كل دفعة لاحقة تلقائياً.

alter table public.contract_payments add column is_advance_payment boolean not null default false;
