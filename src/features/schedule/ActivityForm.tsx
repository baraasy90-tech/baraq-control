import { useState } from "react";
import { FieldLabel, TextInput, PrimaryButton, SecondaryButton, ErrorText } from "@/components/ui";
import { ChecklistEditor } from "@/features/schedule/ChecklistEditor";
import { CALENDAR_LABEL } from "@/utils/dates";
import { fmtMoney } from "@/utils/money";
import { REL_LABEL, LAG_UNIT_LABEL } from "@/features/schedule/lib/schedule";
import type { ChecklistItemDraft } from "@/features/schedule/api/useSaveChecklist";
import type { Activity, BudgetType, CalendarType, CustomCalendar, DepType, LagUnit } from "@/types/domain";

export interface ActivityFormValues {
  name: string;
  durationDays: number;
  calendarType: CalendarType;
  customCalendarId: string | null;
  scheduleMode: "manual" | "dependency";
  startDate: string | null;
  dependsOn: string | null;
  depType: DepType;
  lagDays: number;
  lagUnit: LagUnit;
  critical: boolean;
  alertLeadDays: number;
  requiresReceiving: boolean;
  budgetType: BudgetType | null;
  plannedAmount: number | null;
  boqQty: number | null;
  boqUnit: string | null;
  boqUnitPrice: number | null;
  checklist: ChecklistItemDraft[];
}

export function ActivityForm({
  initial,
  candidateDependencies,
  customCalendars,
  onSave,
  onCancel,
  saving,
}: {
  initial: Activity | null;
  candidateDependencies: Activity[];
  customCalendars: CustomCalendar[];
  onSave: (values: ActivityFormValues) => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [durationDays, setDurationDays] = useState(String(initial?.durationDays ?? 5));
  const [calendarSelection, setCalendarSelection] = useState<string>(
    initial?.customCalendarId ? `custom:${initial.customCalendarId}` : (initial?.calendarType ?? "workdays")
  );
  const [scheduleMode, setScheduleMode] = useState<"manual" | "dependency">(
    initial?.dependsOn ? "dependency" : "manual"
  );
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [dependsOn, setDependsOn] = useState(initial?.dependsOn ?? "");
  const [depType, setDepType] = useState<DepType>(initial?.depType ?? "FS");
  const [lagDays, setLagDays] = useState(String(initial?.lagDays ?? 0));
  const [lagUnit, setLagUnit] = useState<LagUnit>(initial?.lagUnit ?? "day");
  const [critical, setCritical] = useState(initial?.critical ?? false);
  const [alertLeadDays, setAlertLeadDays] = useState(String(initial?.alertLeadDays ?? 7));
  const [requiresReceiving, setRequiresReceiving] = useState(initial?.requiresReceiving ?? false);
  const [budgetType, setBudgetType] = useState<BudgetType | "none">(initial?.budgetType ?? "none");
  const [plannedAmount, setPlannedAmount] = useState(String(initial?.plannedAmount ?? ""));
  const [boqQty, setBoqQty] = useState(String(initial?.boqQty ?? ""));
  const [boqUnit, setBoqUnit] = useState(initial?.boqUnit ?? "");
  const [boqUnitPrice, setBoqUnitPrice] = useState(String(initial?.boqUnitPrice ?? ""));
  const [checklist, setChecklist] = useState<ChecklistItemDraft[]>(
    (initial?.checklist ?? []).map((c) => ({ id: c.id, text: c.text, photoRequired: c.photoRequired, order: c.order }))
  );
  const [error, setError] = useState("");

  const canSubmit = name.trim().length > 0 && Number(durationDays) > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (scheduleMode === "dependency" && !dependsOn) {
      setError("اختر البند السابق للاعتماد عليه، أو بدّل لجدولة يدوية");
      return;
    }
    setError("");
    const isCustom = calendarSelection.startsWith("custom:");
    onSave({
      name: name.trim(),
      durationDays: Number(durationDays),
      calendarType: isCustom ? "workdays" : (calendarSelection as CalendarType),
      customCalendarId: isCustom ? calendarSelection.slice("custom:".length) : null,
      scheduleMode,
      startDate: scheduleMode === "manual" ? startDate || null : null,
      dependsOn: scheduleMode === "dependency" ? dependsOn : null,
      depType,
      lagDays: Number(lagDays) || 0,
      lagUnit,
      critical,
      alertLeadDays: Number(alertLeadDays) || 7,
      requiresReceiving,
      budgetType: budgetType === "none" ? null : budgetType,
      plannedAmount: budgetType === "lumpsum" ? Number(plannedAmount) || 0 : null,
      boqQty: budgetType === "boq" ? Number(boqQty) || 0 : null,
      boqUnit: budgetType === "boq" ? boqUnit.trim() || null : null,
      boqUnitPrice: budgetType === "boq" ? Number(boqUnitPrice) || 0 : null,
      checklist,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <FieldLabel>اسم المرحلة/البند</FieldLabel>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: صبة اللبشة" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>المدة (أيام)</FieldLabel>
          <TextInput
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            inputMode="numeric"
            type="number"
            min={1}
          />
        </div>
        <div>
          <FieldLabel>نوع التقويم</FieldLabel>
          <select
            value={calendarSelection}
            onChange={(e) => setCalendarSelection(e.target.value)}
            className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border"
          >
            {Object.entries(CALENDAR_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
            {customCalendars.map((c) => (
              <option key={c.id} value={`custom:${c.id}`}>
                {c.name} (مخصص)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <FieldLabel>طريقة الجدولة</FieldLabel>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setScheduleMode("manual")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border cursor-pointer ${scheduleMode === "manual" ? "border-primary bg-primary-bg text-ink" : "border-line bg-transparent text-ink-soft"}`}
          >
            تاريخ بداية يدوي
          </button>
          <button
            type="button"
            onClick={() => setScheduleMode("dependency")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border cursor-pointer ${scheduleMode === "dependency" ? "border-primary bg-primary-bg text-ink" : "border-line bg-transparent text-ink-soft"}`}
          >
            اعتماد على بند سابق
          </button>
        </div>

        {scheduleMode === "manual" ? (
          <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        ) : (
          <div className="flex flex-col gap-2">
            <select
              value={dependsOn}
              onChange={(e) => setDependsOn(e.target.value)}
              className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border"
            >
              <option value="">اختر البند السابق</option>
              {candidateDependencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={depType}
                onChange={(e) => setDepType(e.target.value as DepType)}
                className="col-span-1 px-2 py-2.5 border border-line rounded-lg text-xs font-sans bg-white box-border"
              >
                {Object.entries(REL_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <TextInput
                value={lagDays}
                onChange={(e) => setLagDays(e.target.value)}
                inputMode="numeric"
                type="number"
                placeholder="مهلة"
                className="col-span-1"
              />
              <select
                value={lagUnit}
                onChange={(e) => setLagUnit(e.target.value as LagUnit)}
                className="col-span-1 px-2 py-2.5 border border-line rounded-lg text-xs font-sans bg-white box-border"
              >
                {Object.entries(LAG_UNIT_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} />
          يتطلب طلباً وتوريداً مسبقاً 📦
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={requiresReceiving}
            onChange={(e) => setRequiresReceiving(e.target.checked)}
          />
          يتطلب استلام
        </label>
      </div>

      {critical && (
        <div>
          <FieldLabel>المدة المتوقعة قبل الموعد لتقديم الطلب (أيام)</FieldLabel>
          <TextInput
            value={alertLeadDays}
            onChange={(e) => setAlertLeadDays(e.target.value)}
            inputMode="numeric"
            type="number"
          />
        </div>
      )}

      <div>
        <FieldLabel>الميزانية</FieldLabel>
        <div className="flex gap-2 mb-3">
          {(["none", "lumpsum", "boq"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setBudgetType(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${budgetType === t ? "border-primary bg-primary-bg text-ink" : "border-line bg-transparent text-ink-soft"}`}
            >
              {t === "none" ? "بدون" : t === "lumpsum" ? "مبلغ مقطوع" : "جدول كميات (BOQ)"}
            </button>
          ))}
        </div>
        {budgetType === "lumpsum" && (
          <TextInput
            value={plannedAmount}
            onChange={(e) => setPlannedAmount(e.target.value)}
            inputMode="numeric"
            type="number"
            placeholder="المبلغ المخطط (ر.س)"
          />
        )}
        {budgetType === "boq" && (
          <div>
            <div className="grid grid-cols-3 gap-2">
              <TextInput value={boqQty} onChange={(e) => setBoqQty(e.target.value)} inputMode="numeric" type="number" placeholder="الكمية" />
              <TextInput value={boqUnit} onChange={(e) => setBoqUnit(e.target.value)} placeholder="الوحدة (م³...)" />
              <TextInput
                value={boqUnitPrice}
                onChange={(e) => setBoqUnitPrice(e.target.value)}
                inputMode="numeric"
                type="number"
                placeholder="سعر الوحدة"
              />
            </div>
            <div className="mt-2 flex items-center justify-between bg-bg border border-line/60 rounded-lg px-3 py-2">
              <span className="text-xs text-ink-soft font-semibold">إجمالي قيمة البند</span>
              <span className="text-sm font-bold text-ink font-mono">
                {fmtMoney((Number(boqQty) || 0) * (Number(boqUnitPrice) || 0))}
              </span>
            </div>
          </div>
        )}
      </div>

      <div>
        <FieldLabel>قائمة الاستلامات الفرعية</FieldLabel>
        <ChecklistEditor items={checklist} onChange={setChecklist} />
      </div>

      <ErrorText>{error}</ErrorText>

      <div className="flex gap-2 pt-3 pb-1 sticky bottom-0 bg-panel border-t border-line/60 -mx-1 px-1 mt-2">
        <SecondaryButton type="button" onClick={onCancel} className="flex-1">
          إلغاء
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={!canSubmit || saving} className="flex-1">
          {saving ? "جارٍ الحفظ..." : "حفظ"}
        </PrimaryButton>
      </div>
    </form>
  );
}
