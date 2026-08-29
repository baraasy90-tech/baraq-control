import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, FileSpreadsheet, Pencil } from "lucide-react";
import {
  Card,
  StatCard,
  SecondaryButton,
  PrimaryButton,
  IconButton,
  Modal,
  ErrorText,
  ExportMenu,
  FieldLabel,
  TextInput,
} from "@/components/ui";
import { BudgetTree } from "@/features/budget/BudgetTree";
import { AddActualEntryForm } from "@/features/budget/AddActualEntryForm";
import { SCurveChart } from "@/features/budget/SCurveChart";
import { useActivities } from "@/features/schedule/api/useActivities";
import { useUpdateActivity } from "@/features/schedule/api/useUpdateActivity";
import { useCreateBudgetEntry } from "@/features/budget/api/useCreateBudgetEntry";
import { useDeleteBudgetEntry } from "@/features/budget/api/useDeleteBudgetEntry";
import { computeBudgetRollup, getPlannedAmount } from "@/features/budget/lib/budget";
import { computeSCurve, computeSCurveFromTotal } from "@/features/budget/lib/sCurve";
import { useContracts } from "@/features/contracts/api/useContract";
import { BudgetVarianceBanner } from "@/features/budget/BudgetVarianceBanner";
import { useCompany } from "@/features/company/useCompany";
import { useCustomCalendarMap } from "@/features/schedule/api/useCustomCalendars";
import { computeSchedule } from "@/features/schedule/lib/schedule";
import { fmtMoney } from "@/utils/money";
import { fmt, todayISO } from "@/utils/dates";
import { exportToExcel } from "@/utils/exportExcel";
import { getErrorMessage } from "@/utils/errors";
import type { Project, BudgetType } from "@/types/domain";

const SOURCE_LABEL: Record<string, string> = { contract: "عقد مقاول", purchase: "شراء مباشر", other: "أخرى" };

type Tab = "budget" | "scurve";

export function BudgetScreen({ project }: { project: Project }) {
  const navigate = useNavigate();
  const { company } = useCompany();
  const activitiesQuery = useActivities(project.id);
  const contractsQuery = useContracts(project.id);
  const customCalendars = useCustomCalendarMap(company.id);
  const totalContractValue = (contractsQuery.data ?? [])
    .filter((c) => c.status === "approved")
    .reduce((sum, c) => sum + (c.totalValue ?? 0), 0);
  const createEntry = useCreateBudgetEntry();
  const deleteEntry = useDeleteBudgetEntry(project.id);
  const updateActivity = useUpdateActivity();

  const [tab, setTab] = useState<Tab>("budget");
  const [scurveMode, setScurveMode] = useState<"detailed" | "auto">("detailed");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [deleteEntryError, setDeleteEntryError] = useState("");

  const [editingBudget, setEditingBudget] = useState(false);
  const [confirmRemoveBudget, setConfirmRemoveBudget] = useState(false);
  const [budgetType, setBudgetType] = useState<BudgetType>("lumpsum");
  const [plannedAmountInput, setPlannedAmountInput] = useState("");
  const [boqQtyInput, setBoqQtyInput] = useState("");
  const [boqUnitInput, setBoqUnitInput] = useState("");
  const [boqUnitPriceInput, setBoqUnitPriceInput] = useState("");
  const [budgetError, setBudgetError] = useState("");

  const activities = activitiesQuery.data ?? [];
  const schedule = computeSchedule(activities, customCalendars);
  const actualEntriesFlat = activities.flatMap((a) => a.actualEntries.map((e) => ({ date: e.date, amount: e.amount })));
  const totalContractValueForCurve = (contractsQuery.data ?? [])
    .filter((c) => c.status === "approved")
    .reduce((sum, c) => sum + (c.totalValue ?? 0), 0);
  const sCurvePoints =
    scurveMode === "detailed"
      ? computeSCurve(activities, schedule, actualEntriesFlat)
      : computeSCurveFromTotal(totalContractValueForCurve, activities, schedule, actualEntriesFlat);
  const selected = activities.find((a) => a.id === selectedId) ?? null;
  const overallRollup = activities
    .filter((a) => a.parentId === null)
    .reduce(
      (acc, root) => {
        const r = computeBudgetRollup(root.id, activities);
        return { planned: acc.planned + r.planned, actual: acc.actual + r.actual };
      },
      { planned: 0, actual: 0 }
    );

  const selectedRollup = selected ? computeBudgetRollup(selected.id, activities) : null;

  const handleAddEntry = async (values: { date: string; amount: number; source: string; note: string | null; contractRef: string | null }) => {
    if (!selected) return;
    setError("");
    try {
      await createEntry.mutateAsync({ activityId: selected.id, projectId: project.id, ...values });
      setFormOpen(false);
    } catch {
      setError("تعذّر إضافة الدفعة، حاول مجدداً");
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    setDeleteEntryError("");
    try {
      await deleteEntry.mutateAsync(entryId);
    } catch (err) {
      setDeleteEntryError(getErrorMessage(err, "تعذّر حذف الدفعة، حاول مجدداً"));
    }
  };

  const openEditBudget = () => {
    if (!selected) return;
    setBudgetType(selected.budgetType ?? "lumpsum");
    setPlannedAmountInput(selected.plannedAmount?.toString() ?? "");
    setBoqQtyInput(selected.boqQty?.toString() ?? "");
    setBoqUnitInput(selected.boqUnit ?? "");
    setBoqUnitPriceInput(selected.boqUnitPrice?.toString() ?? "");
    setBudgetError("");
    setEditingBudget(true);
  };

  const handleSaveBudget = async () => {
    if (!selected) return;
    setBudgetError("");
    try {
      if (budgetType === "lumpsum") {
        await updateActivity.mutateAsync({
          id: selected.id,
          projectId: project.id,
          budgetType: "lumpsum",
          plannedAmount: Number(plannedAmountInput) || 0,
          boqQty: null,
          boqUnit: null,
          boqUnitPrice: null,
        });
      } else {
        await updateActivity.mutateAsync({
          id: selected.id,
          projectId: project.id,
          budgetType: "boq",
          plannedAmount: null,
          boqQty: Number(boqQtyInput) || 0,
          boqUnit: boqUnitInput.trim() || null,
          boqUnitPrice: Number(boqUnitPriceInput) || 0,
        });
      }
      setEditingBudget(false);
    } catch (err) {
      setBudgetError(getErrorMessage(err, "تعذّر حفظ الميزانية، حاول مجدداً"));
    }
  };

  const handleRemoveBudget = async () => {
    if (!selected) return;
    setBudgetError("");
    try {
      await updateActivity.mutateAsync({
        id: selected.id,
        projectId: project.id,
        budgetType: null,
        plannedAmount: null,
        boqQty: null,
        boqUnit: null,
        boqUnitPrice: null,
      });
      setConfirmRemoveBudget(false);
    } catch (err) {
      setBudgetError(getErrorMessage(err, "تعذّر حذف الميزانية، حاول مجدداً"));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportToExcel(`الميزانية-${project.name}-${todayISO()}`, [
        {
          name: "الميزانية",
          rows: activities.map((a) => {
            const r = computeBudgetRollup(a.id, activities);
            return {
              "البند": a.name,
              "مخطط": r.planned,
              "فعلي": r.actual,
              "الفرق": r.planned - r.actual,
            };
          }),
        },
        {
          name: "الدفعات الفعلية",
          rows: activities.flatMap((a) =>
            a.actualEntries.map((entry) => ({
              "البند": a.name,
              "التاريخ": fmt(entry.date),
              "المبلغ": entry.amount,
              "المصدر": SOURCE_LABEL[entry.source] ?? entry.source,
              "ملاحظة": entry.note ?? "",
            }))
          ),
        },
      ]);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-ink truncate">الميزانية — {project.name}</h1>
        <div className="flex items-center gap-2 shrink-0">
          <ExportMenu pending={exporting} options={[{ label: "تصدير Excel", icon: FileSpreadsheet, onSelect: handleExport }]} />
          <SecondaryButton onClick={() => navigate(`/projects/${project.id}`)}>رجوع</SecondaryButton>
        </div>
      </div>

      <BudgetVarianceBanner
        projectId={project.id}
        contractValue={contractsQuery.data && contractsQuery.data.length > 0 ? totalContractValue : null}
        trackedBudget={overallRollup.planned}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatCard label="إجمالي المخطط" value={fmtMoney(overallRollup.planned)} />
        <StatCard label="إجمالي الفعلي" value={fmtMoney(overallRollup.actual)} />
        <StatCard
          label="الفرق"
          value={fmtMoney(overallRollup.planned - overallRollup.actual)}
          tone={overallRollup.actual > overallRollup.planned ? "critical" : undefined}
        />
      </div>

      <div className="flex gap-2 mb-4">
        {(
          [
            { key: "budget", label: "تفاصيل الميزانية" },
            { key: "scurve", label: "منحنى الأداء (S-Curve)" },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-sm font-semibold px-3 py-1.5 rounded-lg cursor-pointer border ${
              tab === t.key ? "border-primary bg-primary-bg text-ink" : "border-line/60 bg-panel text-ink-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activitiesQuery.isLoading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}

      {tab === "scurve" ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-ink-soft">طريقة حساب المخطط:</span>
            {(
              [
                { key: "detailed", label: "تفصيلي لكل بند" },
                { key: "auto", label: "توزيع تلقائي من قيمة العقد" },
              ] as { key: "detailed" | "auto"; label: string }[]
            ).map((m) => (
              <button
                key={m.key}
                onClick={() => setScurveMode(m.key)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer border ${
                  scurveMode === m.key ? "border-primary bg-primary-bg text-ink" : "border-line/60 bg-panel text-ink-soft"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <SCurveChart points={sCurvePoints} />
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <Card className="lg:max-h-[70vh] lg:overflow-y-auto">
          <BudgetTree activities={activities} selectedId={selectedId} onSelect={(a) => setSelectedId(a.id)} />
        </Card>

        <Card>
          {!selected ? (
            <p className="text-sm text-ink-soft">اختر بنداً من القائمة لعرض تفاصيل الميزانية</p>
          ) : (
            <div>
              <h2 className="text-base font-bold text-ink mb-3 truncate">{selected.name}</h2>

              {selectedRollup && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <StatCard label="مخطط" value={fmtMoney(selectedRollup.planned)} />
                  <StatCard label="فعلي" value={fmtMoney(selectedRollup.actual)} />
                  <StatCard
                    label={`الفرق (${selectedRollup.variancePct}%)`}
                    value={fmtMoney(selectedRollup.variance)}
                    tone={selectedRollup.variance < 0 ? "critical" : undefined}
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-2 bg-bg border border-line/60 rounded-lg px-3 py-2.5 mb-3">
                <p className="text-xs text-ink-soft">
                  {getPlannedAmount(selected) > 0 ? (
                    <>
                      ميزانية هذا البند تحديداً: <span className="font-semibold text-ink">{fmtMoney(getPlannedAmount(selected))}</span>
                      {selected.budgetType === "boq" &&
                        ` (${selected.boqQty} ${selected.boqUnit ?? ""} × ${fmtMoney(selected.boqUnitPrice)})`}
                    </>
                  ) : (
                    "لا توجد ميزانية مرفقة لهذا البند تحديداً"
                  )}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <IconButton icon={Pencil} label="تعديل الميزانية" onClick={openEditBudget} />
                  {getPlannedAmount(selected) > 0 && (
                    <IconButton
                      icon={Trash2}
                      label="حذف الميزانية المرفقة"
                      tone="critical"
                      onClick={() => {
                        setBudgetError("");
                        setConfirmRemoveBudget(true);
                      }}
                    />
                  )}
                </div>
              </div>

              {getPlannedAmount(selected) > 0 && schedule[selected.id] && (
                <div className="mb-4">
                  <SCurveChart
                    points={computeSCurve(
                      [selected],
                      schedule,
                      selected.actualEntries.map((e) => ({ date: e.date, amount: e.amount }))
                    )}
                    title="منحنى الأداء لهذا البند"
                    height={220}
                    bare
                  />
                </div>
              )}

              <PrimaryButton onClick={() => setFormOpen(true)} className="w-auto px-4 py-2 text-sm mb-4 inline-flex items-center gap-1.5">
                <Plus size={15} strokeWidth={2.5} /> إضافة دفعة فعلية
              </PrimaryButton>

              <h3 className="text-sm font-bold text-ink mb-2">الدفعات الفعلية</h3>
              <ErrorText>{deleteEntryError}</ErrorText>
              {selected.actualEntries.length === 0 ? (
                <p className="text-sm text-ink-soft">لا توجد دفعات مسجّلة بعد</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selected.actualEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between gap-2 bg-bg border border-line/60 rounded-lg px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-ink font-mono">{fmtMoney(entry.amount)}</div>
                        <div className="text-xs text-ink-soft truncate">
                          {fmt(entry.date)} · {SOURCE_LABEL[entry.source] ?? entry.source}
                          {entry.contractRef && ` · ${entry.contractRef}`}
                        </div>
                        {entry.note && <div className="text-xs text-ink-soft truncate">{entry.note}</div>}
                      </div>
                      <IconButton icon={Trash2} label="حذف" tone="critical" onClick={() => handleDeleteEntry(entry.id)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
      )}

      {formOpen && selected && (
        <Modal title={`دفعة جديدة — ${selected.name}`} onClose={() => setFormOpen(false)}>
          <ErrorText>{error}</ErrorText>
          <AddActualEntryForm onSubmit={handleAddEntry} onCancel={() => setFormOpen(false)} submitting={createEntry.isPending} />
        </Modal>
      )}

      {editingBudget && selected && (
        <Modal title={`تعديل الميزانية — ${selected.name}`} onClose={() => setEditingBudget(false)}>
          <FieldLabel>نوع الميزانية</FieldLabel>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setBudgetType("lumpsum")}
              className={`text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer border flex-1 ${
                budgetType === "lumpsum" ? "border-ink bg-ink text-white" : "border-line/60 bg-panel text-ink-soft"
              }`}
            >
              مبلغ مقطوع
            </button>
            <button
              type="button"
              onClick={() => setBudgetType("boq")}
              className={`text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer border flex-1 ${
                budgetType === "boq" ? "border-ink bg-ink text-white" : "border-line/60 bg-panel text-ink-soft"
              }`}
            >
              كمية × سعر وحدة (BOQ)
            </button>
          </div>

          {budgetType === "lumpsum" ? (
            <>
              <FieldLabel>المبلغ المخطط</FieldLabel>
              <TextInput type="number" value={plannedAmountInput} onChange={(e) => setPlannedAmountInput(e.target.value)} />
            </>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <FieldLabel>الكمية</FieldLabel>
                <TextInput type="number" value={boqQtyInput} onChange={(e) => setBoqQtyInput(e.target.value)} />
              </div>
              <div>
                <FieldLabel>الوحدة</FieldLabel>
                <TextInput value={boqUnitInput} onChange={(e) => setBoqUnitInput(e.target.value)} placeholder="م٢، طن..." />
              </div>
              <div>
                <FieldLabel>سعر الوحدة</FieldLabel>
                <TextInput type="number" value={boqUnitPriceInput} onChange={(e) => setBoqUnitPriceInput(e.target.value)} />
              </div>
            </div>
          )}

          <ErrorText>{budgetError}</ErrorText>
          <div className="flex gap-2 mt-4">
            <PrimaryButton onClick={handleSaveBudget} disabled={updateActivity.isPending} className="flex-1">
              {updateActivity.isPending ? "جارٍ الحفظ..." : "حفظ"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setEditingBudget(false)} className="flex-1">
              إلغاء
            </SecondaryButton>
          </div>
        </Modal>
      )}

      {confirmRemoveBudget && selected && (
        <Modal title="تأكيد حذف الميزانية" onClose={() => setConfirmRemoveBudget(false)}>
          <p className="text-sm text-ink-soft mb-5">
            هل أنت متأكد من حذف الميزانية المرفقة بـ"{selected.name}"؟ لن يُحذف البند نفسه من الجدولة، فقط قيمة ميزانيته المخططة.
          </p>
          <ErrorText>{budgetError}</ErrorText>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setConfirmRemoveBudget(false)} className="flex-1">
              إلغاء
            </SecondaryButton>
            <button
              onClick={handleRemoveBudget}
              disabled={updateActivity.isPending}
              className="flex-1 py-2.5 rounded-lg bg-critical text-white border-none font-bold text-sm cursor-pointer disabled:opacity-50"
            >
              {updateActivity.isPending ? "جارٍ الحذف..." : "حذف نهائياً"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
