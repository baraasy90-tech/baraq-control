import { useState } from "react";
import { Trash2 } from "lucide-react";
import { DecisionPill } from "@/features/receiving/DecisionPill";
import { ReportPreviewModal } from "@/features/receiving/ReportPreviewModal";
import { Modal, SecondaryButton, IconButton } from "@/components/ui";
import type { ChecklistItem, Submission } from "@/types/domain";

export function SubmissionHistory({
  activityName,
  submissions,
  checklistItems,
  onDelete,
  onEdit,
  onPrint,
  deleting,
}: {
  activityName: string;
  submissions: Submission[];
  checklistItems: ChecklistItem[];
  onDelete: (submissionId: string) => void;
  onEdit: (submission: Submission) => void;
  onPrint: (submission: Submission) => void;
  deleting?: boolean;
}) {
  const [previewing, setPreviewing] = useState<Submission | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (submissions.length === 0) {
    return <p className="text-sm text-ink-soft">لا توجد تقديمات سابقة</p>;
  }

  const sorted = [...submissions].reverse();

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((s) => (
        <div key={s.id} className="flex items-center gap-2 bg-bg border border-line/60 rounded-lg px-3 py-2.5">
          <button onClick={() => setPreviewing(s)} className="flex-1 min-w-0 text-right cursor-pointer flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink truncate">{s.managerName}</div>
              <div className="text-xs text-ink-soft">{new Date(s.createdAt).toLocaleDateString("ar-SA")}</div>
            </div>
            <DecisionPill submissions={[s]} />
          </button>
          <IconButton icon={Trash2} label="حذف التقديم" tone="critical" onClick={() => setConfirmDeleteId(s.id)} />
        </div>
      ))}

      {previewing && (
        <ReportPreviewModal
          activityName={activityName}
          submission={previewing}
          checklistItems={checklistItems}
          onClose={() => setPreviewing(null)}
          onPrint={() => onPrint(previewing)}
          onEdit={() => {
            setPreviewing(null);
            onEdit(previewing);
          }}
          onDelete={() => {
            setPreviewing(null);
            setConfirmDeleteId(previewing.id);
          }}
        />
      )}

      {confirmDeleteId && (
        <Modal title="تأكيد حذف التقديم" onClose={() => setConfirmDeleteId(null)}>
          <p className="text-sm text-ink-soft mb-5">
            هل أنت متأكد من حذف هذا التقديم؟ سيُحذف نهائياً مع صوره وتوقيعه — يمكنك بعدها إرسال تقديم جديد معدَّل.
          </p>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setConfirmDeleteId(null)} className="flex-1">
              إلغاء
            </SecondaryButton>
            <button
              onClick={() => {
                onDelete(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-lg bg-critical text-white border-none font-bold text-sm cursor-pointer disabled:opacity-50"
            >
              حذف نهائياً
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
