import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, StatCard, SecondaryButton, PrimaryButton, IconButton, FieldLabel, TextInput, ErrorText, Modal } from "@/components/ui";
import {
  useExtraWorks,
  useCreateExtraWork,
  useSubmitExtraWork,
  useReviewExtraWork,
  useDeleteExtraWork,
} from "@/features/contracts/api/useExtraWorks";
import { STATUS_LABEL, STATUS_TONE } from "@/features/contracts/statusLabels";
import { fmtMoney } from "@/utils/money";

function numOrNull(v: string): number | null {
  const n = Number(v);
  return v.trim() === "" || Number.isNaN(n) ? null : n;
}

export function ExtraWorksSection({
  readOnly = false,
  contractId,
  canPmApprove,
  canFinanceApprove,
  isIndividual,
}: {
  readOnly?: boolean;
  contractId: string;
  canPmApprove: boolean;
  canFinanceApprove: boolean;
  isIndividual: boolean;
}) {
  const extraWorksQuery = useExtraWorks(contractId);
  const createExtraWork = useCreateExtraWork(contractId);
  const submitExtraWork = useSubmitExtraWork(contractId);
  const reviewExtraWork = useReviewExtraWork(contractId);
  const deleteExtraWork = useDeleteExtraWork(contractId);

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const extraWorks = extraWorksQuery.data ?? [];
  const approvedTotal = extraWorks.filter((e) => e.status === "approved").reduce((s, e) => s + e.amount, 0);

  const handleCreate = async () => {
    if (readOnly) return;
    if (!title.trim()) return;
    setError("");
    const parsedAmount = numOrNull(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("أدخل قيمة صحيحة للبند");
      return;
    }
    try {
      await createExtraWork.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        amount: parsedAmount,
        autoApprove: isIndividual,
      });
      setCreating(false);
      setTitle("");
      setDescription("");
      setAmount("");
    } catch {
      setError("تعذّر إضافة البند، حاول مجدداً");
    }
  };

  const handleReview = async (extraWorkId: string, approve: boolean) => {
    if (readOnly) return;
    await reviewExtraWork.mutateAsync({ extraWorkId, approve, note: reviewNote.trim() || null });
    setReviewingId(null);
    setReviewNote("");
  };

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-bold text-ink">الأعمال الإضافية</h2>
        <SecondaryButton disabled={readOnly} onClick={() => setCreating(true)} className="text-xs px-3 py-1.5 inline-flex items-center gap-1.5">
          <Plus size={14} strokeWidth={2.5} /> بند جديد
        </SecondaryButton>
      </div>

      {approvedTotal > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <StatCard label="إجمالي الأعمال الإضافية المعتمدة" value={fmtMoney(approvedTotal)} />
        </div>
      )}

      {extraWorks.length === 0 ? (
        <p className="text-sm text-ink-soft">لا توجد أعمال إضافية مسجّلة بعد لهذا العقد</p>
      ) : (
        <div className="flex flex-col gap-2">
          {extraWorks.map((ew) => (
            <div key={ew.id} className="bg-bg border border-line/60 rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">{ew.title}</div>
                  <div className="text-xs text-ink-soft font-mono">{fmtMoney(ew.amount)}</div>
                  {ew.description && <div className="text-xs text-ink-soft mt-0.5">{ew.description}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${STATUS_TONE[ew.status]}`}>
                    {STATUS_LABEL[ew.status]}
                  </span>
                  {(ew.status === "draft" || ew.status === "rejected") && (
                    <>
                      <SecondaryButton
                        onClick={() => submitExtraWork.mutate(ew.id)}
                        disabled={readOnly || (submitExtraWork.isPending)}
                        className="text-xs px-2.5 py-1"
                      >
                        تقديم للاعتماد
                      </SecondaryButton>
                      <IconButton disabled={readOnly} icon={Trash2} label="حذف" tone="critical" onClick={() => deleteExtraWork.mutate(ew.id)} />
                    </>
                  )}
                </div>
              </div>

              {ew.status === "pending_pm_approval" && canPmApprove && (
                <div className="mt-2 pt-2 border-t border-line/60">
                  {reviewingId === ew.id ? (
                    <>
                      <TextInput disabled={readOnly}
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="ملاحظة الاعتماد/الرفض (اختياري)"
                        className="text-xs"
                      />
                      <div className="flex gap-2 mt-2">
                        <PrimaryButton disabled={readOnly} onClick={() => handleReview(ew.id, true)} className="w-auto px-3 py-1.5 text-xs">
                          اعتماد وتحويل للمالية
                        </PrimaryButton>
                        <SecondaryButton disabled={readOnly} onClick={() => handleReview(ew.id, false)} className="text-xs px-3 py-1.5">
                          رفض
                        </SecondaryButton>
                      </div>
                    </>
                  ) : (
                    <SecondaryButton disabled={readOnly} onClick={() => setReviewingId(ew.id)} className="text-xs px-3 py-1.5">
                      مراجعة الاعتماد الأولي
                    </SecondaryButton>
                  )}
                </div>
              )}

              {ew.status === "pending_finance_approval" && canFinanceApprove && (
                <div className="mt-2 pt-2 border-t border-line/60">
                  {reviewingId === ew.id ? (
                    <>
                      <TextInput disabled={readOnly}
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="ملاحظة الاعتماد/الرفض (اختياري)"
                        className="text-xs"
                      />
                      <div className="flex gap-2 mt-2">
                        <PrimaryButton disabled={readOnly} onClick={() => handleReview(ew.id, true)} className="w-auto px-3 py-1.5 text-xs">
                          الاعتماد النهائي
                        </PrimaryButton>
                        <SecondaryButton disabled={readOnly} onClick={() => handleReview(ew.id, false)} className="text-xs px-3 py-1.5">
                          رفض
                        </SecondaryButton>
                      </div>
                    </>
                  ) : (
                    <SecondaryButton disabled={readOnly} onClick={() => setReviewingId(ew.id)} className="text-xs px-3 py-1.5">
                      الاعتماد المالي النهائي
                    </SecondaryButton>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {creating && (
        <Modal title="بند أعمال إضافية جديد" onClose={() => setCreating(false)}>
          <FieldLabel>عنوان البند</FieldLabel>
          <TextInput disabled={readOnly} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <div className="mb-3" />
          <FieldLabel>الوصف (اختياري)</FieldLabel>
          <textarea disabled={readOnly}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border resize-y"
          />
          <div className="mb-3" />
          <FieldLabel>القيمة</FieldLabel>
          <TextInput disabled={readOnly} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2 mt-4">
            <PrimaryButton onClick={handleCreate} disabled={readOnly || (!title.trim() || createExtraWork.isPending)} className="flex-1">
              {createExtraWork.isPending ? "جارٍ الإضافة..." : "إضافة"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setCreating(false)} className="flex-1">
              إلغاء
            </SecondaryButton>
          </div>
        </Modal>
      )}
    </Card>
  );
}
