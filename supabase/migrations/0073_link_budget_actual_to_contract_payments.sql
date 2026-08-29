-- ربط فعلي (FK) بين الدفعات الفعلية بالميزانية ودفعات العقد الحقيقية — بدل الاعتماد
-- على حقل contract_ref النصي الحر الذي لا يضمن وجود أي علاقة فعلية (وهذا بالضبط سبب
-- بقاء دفعات فعلية "معلَّقة" بلا معنى بعد حذف عقود تجريبية، دون أي طريقة لاكتشافها).
--
-- on delete set null عمداً وليس cascade: حذف دفعة عقد لا يجب أن يمحو صف مصروف فعلي
-- حقيقي بصمت — يتحوّل الصف بدلاً من ذلك إلى "غير مرتبط" بوضوح ليراجعه المستخدم يدوياً.
alter table public.budget_actual_entries
  add column contract_payment_id uuid references public.contract_payments (id) on delete set null;

create index budget_actual_entries_contract_payment_id_idx on public.budget_actual_entries (contract_payment_id);

-- توسعة جدول تسوية الاختلاف الموجود (بدل إنشاء جدول موازٍ) ليخدم نوعاً ثانياً من
-- المقارنة: "إجمالي المدفوع فعلياً من العقود" مقابل "إجمالي الفعلي المسجَّل بالميزانية"،
-- إلى جانب النوع الأصلي "قيمة العقد مقابل الميزانية المخططة". نفس سياسات RLS/الاعتماد
-- الحالية (can_approve_budget_variance) تبقى كما هي وتغطي النوعين معاً تلقائياً.
alter table public.budget_reconciliation_notes
  add column kind text not null default 'value_vs_planned' check (kind in ('value_vs_planned', 'paid_vs_actual'));
