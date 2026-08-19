export const AUDIT_TABLE_LABEL: Record<string, string> = {
  contracts: "عقد",
  contract_payments: "دفعة/مستخلص",
  contract_extra_works: "بند أعمال إضافية",
  contract_deductions: "خصم/مخالفة",
  material_requests: "طلب مواد",
  budget_actual_entries: "دفعة ميزانية فعلية",
};

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  insert: "إنشاء",
  update: "تعديل",
  delete: "حذف",
};

export const AUDIT_ACTION_TONE: Record<string, string> = {
  insert: "text-accent bg-accent-bg",
  update: "text-warn bg-warn-bg",
  delete: "text-critical bg-critical-bg",
};

const FIELD_LABEL: Record<string, string> = {
  status: "الحالة",
  title: "العنوان",
  contract_name: "اسم العقد",
  total_value: "قيمة العقد",
  amount: "المبلغ",
  percentage: "النسبة",
  paid: "مدفوعة",
  due_date: "تاريخ الاستحقاق",
  description: "الوصف",
  violation_name: "اسم المخالفة",
  deduction_amount: "قيمة الخصم",
  damage_description: "وصف الضرر",
  item_name: "اسم المادة",
  sample_price: "سعر العينة",
  quote_price: "سعر عرض السعر",
  date: "التاريخ",
  source: "المصدر",
  note: "ملاحظة",
  guarantee_note: "ملاحظة الضمان",
  retention_percentage: "نسبة الاستقطاع",
  retention_released: "استرداد الضمان",
  advance_payment_percentage: "نسبة الدفعة المقدمة",
  advance_deduction_percentage: "نسبة خصم الاسترداد",
  has_advance_payment: "دفعة مقدمة",
  is_advance_payment: "هي الدفعة المقدمة",
  start_date: "تاريخ البدء",
  duration_days: "المدة (أيام)",
  payment_terms: "سياسة الدفعات",
  settlement_status: "حالة التصفية",
  contract_ref: "مرجع العقد",
};

const SKIP_KEYS = new Set([
  "id",
  "project_id",
  "contract_id",
  "activity_id",
  "created_by",
  "created_at",
  "submitted_by",
  "submitted_at",
  "pm_reviewed_by",
  "pm_reviewed_at",
  "pm_review_note",
  "finance_reviewed_by",
  "finance_reviewed_at",
  "finance_review_note",
]);

export function fieldLabel(key: string): string {
  return FIELD_LABEL[key] ?? key;
}

export function formatAuditValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  return String(v);
}

export interface AuditDiffRow {
  key: string;
  oldValue: unknown;
  newValue: unknown;
}

export function diffAuditRecord(oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null): AuditDiffRow[] {
  const keys = new Set([...Object.keys(oldData ?? {}), ...Object.keys(newData ?? {})]);
  const rows: AuditDiffRow[] = [];
  for (const key of keys) {
    if (SKIP_KEYS.has(key)) continue;
    const oldValue = oldData?.[key];
    const newValue = newData?.[key];
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
    rows.push({ key, oldValue, newValue });
  }
  return rows;
}
