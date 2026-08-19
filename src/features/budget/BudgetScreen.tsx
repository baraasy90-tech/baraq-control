import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, FileSpreadsheet } from "lucide-react";
import { Card, StatCard, SecondaryButton, PrimaryButton, IconButton, Modal, ErrorText } from "@/components/ui";
import { BudgetTree } from "@/features/budget/BudgetTree";
import { AddActualEntryForm } from "@/features/budget/AddActualEntryForm";
import { useActivities } from "@/features/schedule/api/useActivities";
import { useCreateBudgetEntry } from "@/features/budget/api/useCreateBudgetEntry";
import { useDeleteBudgetEntry } from "@/features/budget/api/useDeleteBudgetEntry";
import { computeBudgetRollup, getPlannedAmount } from "@/features/budget/lib/budget";
import { useContracts } from "@/features/contracts/api/useContract";
import { BudgetVarianceBanner } from "@/features/budget/BudgetVarianceBanner";
import { fmtMoney } from "@/utils/money";
import { fmt, todayISO } from "@/utils/dates";
import { exportToExcel } from "@/utils/exportExcel";
import type { Project } from "@/types/domain";

const SOURCE_LABEL: Record<string, string> = { contract: "عقد مقاول", purchase: "شراء مباشر", other: "أخرى" };

export function BudgetScreen({ project }: { project: Project }) {
  const navigate = useNavigate();
  const activitiesQuery = useActivities(project.id);
  const contractsQuery = useContracts(project.id);
  const totalContractValue = (contractsQuery.data ?? [])
    .filter((c) => c.status === "approved")
    .reduce((sum, c) => sum + (c.totalValue ?? 0), 0);
  const createEntry = useCreateBudgetEntry();
  const deleteEntry = useDeleteBudgetEntry(project.id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const activities = activitiesQuery.data ?? [];
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
          <SecondaryButton onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-1.5">
            <FileSpreadsheet size={15} /> {exporting ? "جارٍ التصدير..." : "تصدير Excel"}
          </SecondaryButton>
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

      {activitiesQuery.isLoading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}

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

              {getPlannedAmount(selected) > 0 && (
                <p className="text-xs text-ink-soft mb-3">
                  ميزانية هذا البند تحديداً: {fmtMoney(getPlannedAmount(selected))}
                  {selected.budgetType === "boq" &&
                    ` (${selected.boqQty} ${selected.boqUnit ?? ""} × ${fmtMoney(selected.boqUnitPrice)})`}
                </p>
              )}

              <PrimaryButton onClick={() => setFormOpen(true)} className="w-auto px-4 py-2 text-sm mb-4 inline-flex items-center gap-1.5">
                <Plus size={15} strokeWidth={2.5} /> إضافة دفعة فعلية
              </PrimaryButton>

              <h3 className="text-sm font-bold text-ink mb-2">الدفعات الفعلية</h3>
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
                      <IconButton icon={Trash2} label="حذف" tone="critical" onClick={() => deleteEntry.mutate(entry.id)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {formOpen && selected && (
        <Modal title={`دفعة جديدة — ${selected.name}`} onClose={() => setFormOpen(false)}>
          <ErrorText>{error}</ErrorText>
          <AddActualEntryForm onSubmit={handleAddEntry} onCancel={() => setFormOpen(false)} submitting={createEntry.isPending} />
        </Modal>
      )}
    </div>
  );
}
