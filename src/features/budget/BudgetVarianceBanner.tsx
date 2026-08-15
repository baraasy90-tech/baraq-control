import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { PrimaryButton, SecondaryButton, TextInput, ErrorText } from "@/components/ui";
import { useReconciliationNotes, useAddReconciliationNote } from "@/features/budget/api/useBudgetReconciliation";
import { fmtMoney } from "@/utils/money";
import { fmt } from "@/utils/dates";

const TOLERANCE = 1;

export function BudgetVarianceBanner({
  projectId,
  contractValue,
  trackedBudget,
}: {
  projectId: string;
  contractValue: number | null;
  trackedBudget: number;
}) {
  const notesQuery = useReconciliationNotes(projectId);
  const addNote = useAddReconciliationNote();
  const [formOpen, setFormOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const notes = notesQuery.data ?? [];
  const hasVariance = contractValue != null && Math.abs(contractValue - trackedBudget) > TOLERANCE;

  if (!hasVariance && notes.length === 0) return null;

  const handleSubmit = async () => {
    if (!note.trim()) return;
    setError("");
    try {
      await addNote.mutateAsync({ projectId, contractValue, trackedBudgetValue: trackedBudget, note: note.trim() });
      setNote("");
      setFormOpen(false);
    } catch {
      setError("تعذّر حفظ المبرر، حاول مجدداً");
    }
  };

  return (
    <div className="mb-6">
      {hasVariance && (
        <div className="bg-warn-bg border border-warn/30 rounded-xl p-4 mb-2">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle size={18} className="text-warn shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink">اختلاف بين قيمة العقد والميزانية المسجّلة عند مدير المشروع</div>
              <div className="text-xs text-ink-soft mt-1">
                قيمة العقد (المالية): {fmtMoney(contractValue)} — الميزانية المخطط لها (مدير المشروع): {fmtMoney(trackedBudget)} — الفرق:{" "}
                {fmtMoney(Math.abs((contractValue ?? 0) - trackedBudget))}
              </div>
            </div>
          </div>

          {!formOpen ? (
            <SecondaryButton onClick={() => setFormOpen(true)} className="text-xs px-3 py-1.5">
              معالجة الاختلاف وإرفاق مبرر
            </SecondaryButton>
          ) : (
            <div className="mt-2">
              <TextInput
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="اشرح سبب الاختلاف (مثال: بند إضافي معتمد لم يُدخل بعد بالميزانية)"
              />
              <ErrorText>{error}</ErrorText>
              <div className="flex gap-2 mt-2">
                <PrimaryButton onClick={handleSubmit} disabled={!note.trim() || addNote.isPending} className="w-auto px-4 py-2 text-xs">
                  {addNote.isPending ? "جارٍ الحفظ..." : "حفظ المبرر"}
                </PrimaryButton>
                <SecondaryButton onClick={() => setFormOpen(false)} className="text-xs px-3 py-1.5">
                  إلغاء
                </SecondaryButton>
              </div>
            </div>
          )}
        </div>
      )}

      {notes.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs text-ink-soft bg-transparent border-none cursor-pointer underline"
          >
            {showHistory ? "إخفاء" : "عرض"} سجل معالجة الاختلافات السابقة ({notes.length})
          </button>
          {showHistory && (
            <div className="flex flex-col gap-1.5 mt-2">
              {notes.map((n) => (
                <div key={n.id} className="text-xs bg-bg rounded-lg px-3 py-2">
                  <div className="text-ink">{n.note}</div>
                  <div className="text-ink-soft mt-0.5">
                    {fmt(n.createdAt)} · عقد: {n.contractValue != null ? fmtMoney(n.contractValue) : "—"} · ميزانية:{" "}
                    {n.trackedBudgetValue != null ? fmtMoney(n.trackedBudgetValue) : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
