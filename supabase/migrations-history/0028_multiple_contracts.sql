-- دعم عدة عقود لكل مشروع (عقد عظم، تشطيبات، مصاعد، مسابح، ...) بدل عقد واحد فقط —
-- الجدول أصلاً لا يمنع عدة صفوف لنفس project_id، هذا فقط يضيف اسماً مميزاً لكل عقد.
alter table public.contracts add column contract_name text not null default 'العقد الرئيسي';
