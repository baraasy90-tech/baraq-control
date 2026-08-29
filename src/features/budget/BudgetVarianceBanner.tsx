import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { PrimaryButton, SecondaryButton, TextInput, ErrorText } from "@/components/ui";
import {
  useReconciliationNotes,
  useAddReconciliationNote,
  useReviewReconciliationNote,
} from "@/features/budget/api/useBudgetReconciliation";
import { useCompany } from "@/features/company/useCompany";
import { useDepartments } from "@/features/company/api/useDepartments";
import { useDepartmentMembers } from "@/features/company/api/useDepartmentMembers";
import { fmtMoney } from "@/utils/money";
import { fmt } from "@/utils/dates";
import type { ReconciliationKind } from "@/types/domain";

const TOLERANCE = 1;

const STATUS_LABEL: Record<string, string> = { pending: "بانتظار الاعتماد", approved: "معتمد", rejected: "مرفوض" };
const STATUS_TONE: Record<string, string> = {
  pending: "text-warn bg-warn-bg",
  approved: "text-accent bg-accent-bg",
  rejected: "text-critical bg-critical-bg",
};

export function BudgetVarianceBanner({
  projectId,
  contractValue,
  trackedBudget,
  kind = "value_vs_planned",
  title = "اختلاف بين قيمة العقد والميزانية المسجّلة عند مدير المشروع",
  valueLabel = "قيمة العقد (المالية)",
  budgetLabel = "الميزانية المخطط لها (مدير المشروع)",
  approvedTitle = "اختلاف الميزانية معتمد",
}: {
  projectId: string;
  contractValue: number | null;
  trackedBudget: number;
  kind?: ReconciliationKind;
  title?: string;
  valueLabel?: string;
  budgetLabel?: string;
  approvedTitle?: string;
}) {
  const { company, profile } = useCompany();
  const departmentsQuery = useDepartments(company.id);
  const departments = departmentsQuery.data ?? [];
  const membersQuery = useDepartmentMembers(departments.map((d) => d.id));
  const members = membersQuery.data ?? [];
  const isOwner = company.createdBy === profile.id;
  const isFinanceMember = members.some(
    (m) => m.userId === profile.id && departments.find((d) => d.id === m.departmentId)?.type === "finance"
  );
  const isExecutive = members.some(
    (m) => m.userId === profile.id && departments.find((d) => d.id === m.departmentId)?.type === "executive"
  );
  const canApprove = isOwner || isExecutive || isFinanceMember;

  const notesQuery = useReconciliationNotes(projectId, kind);
  const addNote = useAddReconciliationNote();
  const reviewNote = useReviewReconciliationNote();
  const [formOpen, setFormOpen] = useState(false);
  const [note, setNote] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const notes = notesQuery.data ?? [];
  const latestNote = notes[0] ?? null;
  const hasVariance = contractValue != null && Math.abs(contractValue - trackedBudget) > TOLERANCE;
  const latestMatchesCurrent =
    latestNote != null &&
    latestNote.contractValue === contractValue &&
    Math.abs((latestNote.trackedBudgetValue ?? 0) - trackedBudget) <= TOLERANCE;

  if (!hasVariance && notes.length === 0) return null;

  const handleSubmit = async () => {
    if (!note.trim()) return;
    setError("");
    try {
      await addNote.mutateAsync({ projectId, kind, contractValue, trackedBudgetValue: trackedBudget, note: note.trim() });
      setNote("");
      setFormOpen(false);
    } catch {
      setError("تعذّر حفظ المبرر، حاول مجدداً");
    }
  };

  const handleReview = async (status: "approved" | "rejected") => {
    if (!latestNote) return;
    setError("");
    try {
      await reviewNote.mutateAsync({ id: latestNote.id, projectId, kind, status, reviewNote: reviewComment.trim() || null });
      setReviewComment("");
    } catch {
      setError("تعذّر تسجيل القرار، حاول مجدداً");
    }
  };

  const showPendingReview = hasVariance && latestNote?.status === "pending" && latestMatchesCurrent;
  const showApprovedConfirmation = hasVariance && latestNote?.status === "approved" && latestMatchesCurrent;
  const showAttachForm = hasVariance && !showPendingReview && !showApprovedConfirmation;

  return (
    <div className="mb-6">
      {showApprovedConfirmation ? (
        <div className="bg-accent-bg border border-accent/30 rounded-xl p-4 mb-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={18} className="text-accent shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink">{approvedTitle}</div>
              <div className="text-xs text-ink-soft mt-1">{latestNote!.note}</div>
            </div>
          </div>
        </div>
      ) : showPendingReview ? (
        <div className="bg-warn-bg border border-warn/30 rounded-xl p-4 mb-2">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle size={18} className="text-warn shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink">اختلاف بانتظار الاعتماد</div>
              <div className="text-xs text-ink-soft mt-1">
                {valueLabel}: {fmtMoney(contractValue)} — {budgetLabel}: {fmtMoney(trackedBudget)} — الفرق:{" "}
                {fmtMoney(Math.abs((contractValue ?? 0) - trackedBudget))}
              </div>
              <div className="text-xs text-ink mt-2 bg-panel border border-line/60 rounded-lg px-3 py-2">{latestNote!.note}</div>
            </div>
          </div>

          {canApprove ? (
            <div className="mt-2">
              <TextInput
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="ملاحظة الاعتماد/الرفض (اختياري)"
              />
              <ErrorText>{error}</ErrorText>
              <div className="flex gap-2 mt-2">
                <PrimaryButton onClick={() => handleReview("approved")} disabled={reviewNote.isPending} className="w-auto px-4 py-2 text-xs">
                  اعتماد
                </PrimaryButton>
                <SecondaryButton onClick={() => handleReview("rejected")} disabled={reviewNote.isPending} className="text-xs px-3 py-2">
                  رفض
                </SecondaryButton>
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-soft">بانتظار اعتماد مدير الحساب أو الإدارة المالية.</p>
          )}
        </div>
      ) : showAttachForm ? (
        <div className="bg-warn-bg border border-warn/30 rounded-xl p-4 mb-2">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle size={18} className="text-warn shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink">{title}</div>
              <div className="text-xs text-ink-soft mt-1">
                {valueLabel}: {fmtMoney(contractValue)} — {budgetLabel}: {fmtMoney(trackedBudget)} — الفرق:{" "}
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
                  {addNote.isPending ? "جارٍ الحفظ..." : "إرسال للاعتماد"}
                </PrimaryButton>
                <SecondaryButton onClick={() => setFormOpen(false)} className="text-xs px-3 py-1.5">
                  إلغاء
                </SecondaryButton>
              </div>
            </div>
          )}
        </div>
      ) : null}

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
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold rounded-full px-2 py-0.5 ${STATUS_TONE[n.status]}`}>{STATUS_LABEL[n.status]}</span>
                  </div>
                  <div className="text-ink">{n.note}</div>
                  {n.reviewNote && <div className="text-ink-soft mt-0.5">ملاحظة الاعتماد: {n.reviewNote}</div>}
                  <div className="text-ink-soft mt-0.5">
                    {fmt(n.createdAt)} · {valueLabel}: {n.contractValue != null ? fmtMoney(n.contractValue) : "—"} · {budgetLabel}:{" "}
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
