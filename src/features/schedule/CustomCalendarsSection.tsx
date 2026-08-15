import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { FieldLabel, TextInput, PrimaryButton, SecondaryButton, IconButton, ErrorText } from "@/components/ui";
import { useCustomCalendars, useSaveCustomCalendar, useDeleteCustomCalendar } from "@/features/schedule/api/useCustomCalendars";
import type { CustomCalendar } from "@/types/domain";

const WEEKDAY_LABELS = [
  { value: 0, label: "أحد" },
  { value: 1, label: "اثنين" },
  { value: 2, label: "ثلاثاء" },
  { value: 3, label: "أربعاء" },
  { value: 4, label: "خميس" },
  { value: 5, label: "جمعة" },
  { value: 6, label: "سبت" },
];

export function CustomCalendarsSection({ companyId }: { companyId: string }) {
  const calendarsQuery = useCustomCalendars(companyId);
  const calendars = calendarsQuery.data ?? [];
  const saveCalendar = useSaveCustomCalendar();
  const deleteCalendar = useDeleteCustomCalendar(companyId);

  const [editing, setEditing] = useState<CustomCalendar | "new" | null>(null);
  const [name, setName] = useState("");
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");

  const startCreate = () => {
    setEditing("new");
    setName("");
    setSelectedDays(new Set());
    setError("");
  };

  const startEdit = (cal: CustomCalendar) => {
    setEditing(cal);
    setName(cal.name);
    setSelectedDays(new Set(cal.workingWeekdays));
    setError("");
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim() || selectedDays.size === 0) {
      setError("أدخل اسماً واختر يوم عمل واحد على الأقل");
      return;
    }
    setError("");
    try {
      await saveCalendar.mutateAsync({
        id: editing !== "new" ? editing?.id : undefined,
        companyId,
        name: name.trim(),
        workingWeekdays: [...selectedDays].sort(),
      });
      setEditing(null);
    } catch {
      setError("تعذّر الحفظ، حاول مجدداً");
    }
  };

  return (
    <div className="bg-panel border border-line/60 shadow-sm rounded-xl p-6 mb-4">
      <h2 className="text-sm font-bold text-ink mb-2">تقاويم عمل مخصصة</h2>
      <p className="text-xs text-ink-soft mb-4">
        بجانب "تقويم عادي (٧ أيام)" و"أيام عمل (٦ أيام)"، أنشئ نمطاً خاصاً (مثل ٣ أيام عمل بالأسبوع) يمكن اختياره
        لأي بند عند إضافته أو تعديله من "إدارة المراحل".
      </p>

      {calendars.length === 0 ? (
        <p className="text-xs text-ink-soft mb-3">لا توجد تقاويم مخصصة بعد</p>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {calendars.map((cal) => (
            <div key={cal.id} className="flex items-center justify-between gap-2 bg-bg rounded-lg px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink truncate">{cal.name}</div>
                <div className="text-xs text-ink-soft">
                  {cal.workingWeekdays
                    .slice()
                    .sort()
                    .map((d) => WEEKDAY_LABELS.find((w) => w.value === d)?.label)
                    .join("، ")}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <IconButton icon={Pencil} label="تعديل" onClick={() => startEdit(cal)} />
                <IconButton icon={Trash2} label="حذف" tone="critical" onClick={() => deleteCalendar.mutate(cal.id)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {editing ? (
        <div className="bg-bg rounded-lg p-3">
          <FieldLabel>اسم التقويم</FieldLabel>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: ٣ أيام عمل" />
          <div className="mt-3">
            <FieldLabel>أيام العمل بالأسبوع</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_LABELS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => toggleDay(w.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                    selectedDays.has(w.value) ? "border-primary bg-primary-bg text-ink" : "border-line bg-transparent text-ink-soft"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2 mt-3">
            <PrimaryButton onClick={handleSave} disabled={saveCalendar.isPending} className="w-auto px-4 py-2 text-xs">
              {saveCalendar.isPending ? "جارٍ الحفظ..." : "حفظ"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setEditing(null)} className="text-xs px-3 py-2">
              إلغاء
            </SecondaryButton>
          </div>
        </div>
      ) : (
        <SecondaryButton onClick={startCreate} className="text-xs px-3 py-2 inline-flex items-center gap-1.5">
          <Plus size={14} strokeWidth={2.5} /> تقويم جديد
        </SecondaryButton>
      )}
    </div>
  );
}
