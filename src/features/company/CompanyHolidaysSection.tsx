import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { FieldLabel, TextInput, PrimaryButton, SecondaryButton, IconButton, ErrorText } from "@/components/ui";
import { useCompanyHolidays, useSaveCompanyHoliday, useDeleteCompanyHoliday } from "@/features/company/api/useCompanyHolidays";
import { fmt } from "@/utils/dates";
import type { CompanyHoliday } from "@/types/domain";

export function CompanyHolidaysSection({ companyId }: { companyId: string }) {
  const holidaysQuery = useCompanyHolidays(companyId);
  const holidays = holidaysQuery.data ?? [];
  const saveHoliday = useSaveCompanyHoliday();
  const deleteHoliday = useDeleteCompanyHoliday(companyId);

  const [editing, setEditing] = useState<CompanyHoliday | "new" | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [recurringYearly, setRecurringYearly] = useState(true);
  const [error, setError] = useState("");

  const startCreate = () => {
    setEditing("new");
    setName("");
    setDate("");
    setRecurringYearly(true);
    setError("");
  };

  const startEdit = (h: CompanyHoliday) => {
    setEditing(h);
    setName(h.name);
    setDate(h.date);
    setRecurringYearly(h.recurringYearly);
    setError("");
  };

  const handleSave = async () => {
    if (!name.trim() || !date) {
      setError("أدخل اسم المناسبة وتاريخها");
      return;
    }
    setError("");
    try {
      await saveHoliday.mutateAsync({
        id: editing !== "new" ? editing?.id : undefined,
        companyId,
        name: name.trim(),
        date,
        recurringYearly,
      });
      setEditing(null);
    } catch {
      setError("تعذّر الحفظ، حاول مجدداً");
    }
  };

  return (
    <div className="bg-panel border border-line/60 shadow-sm rounded-xl p-6 mb-4">
      <h2 className="text-sm font-bold text-ink mb-2">أعياد ومناسبات خاصة</h2>
      <p className="text-xs text-ink-soft mb-4">
        أضف يدوياً أي عطلة رسمية أو مناسبة خاصة بشركتك أو بلدك — تظهر بجانب الأعياد المحسوبة تلقائياً ضمن قسم
        المهام والجدول الزمني، وتُصحّح أي تاريخ ترى أنه غير دقيق.
      </p>

      {holidays.length === 0 ? (
        <p className="text-xs text-ink-soft mb-3">لا توجد مناسبات مُضافة يدوياً بعد</p>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {holidays.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-2 bg-bg rounded-lg px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink truncate">{h.name}</div>
                <div className="text-xs text-ink-soft">
                  {fmt(h.date)} {h.recurringYearly && "· يتكرر كل سنة"}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <IconButton icon={Pencil} label="تعديل" onClick={() => startEdit(h)} />
                <IconButton icon={Trash2} label="حذف" tone="critical" onClick={() => deleteHoliday.mutate(h.id)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {editing ? (
        <div className="bg-bg rounded-lg p-3">
          <FieldLabel>اسم المناسبة</FieldLabel>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: اليوم الوطني" />
          <div className="mt-3">
            <FieldLabel>التاريخ</FieldLabel>
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink mt-3">
            <input type="checkbox" checked={recurringYearly} onChange={(e) => setRecurringYearly(e.target.checked)} />
            يتكرر كل سنة بنفس اليوم والشهر
          </label>
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2 mt-3">
            <PrimaryButton onClick={handleSave} disabled={saveHoliday.isPending} className="w-auto px-4 py-2 text-xs">
              {saveHoliday.isPending ? "جارٍ الحفظ..." : "حفظ"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setEditing(null)} className="text-xs px-3 py-2">
              إلغاء
            </SecondaryButton>
          </div>
        </div>
      ) : (
        <SecondaryButton onClick={startCreate} className="text-xs px-3 py-2 inline-flex items-center gap-1.5">
          <Plus size={14} strokeWidth={2.5} /> مناسبة جديدة
        </SecondaryButton>
      )}
    </div>
  );
}
