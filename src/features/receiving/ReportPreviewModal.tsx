import { Modal, SecondaryButton } from "@/components/ui";
import { DecisionStamp } from "@/features/receiving/DecisionStamp";
import type { ChecklistItem, Submission } from "@/types/domain";

export function ReportPreviewModal({
  activityName,
  submission,
  checklistItems,
  onClose,
  onDelete,
  onEdit,
  onPrint,
}: {
  activityName: string;
  submission: Submission;
  checklistItems: ChecklistItem[];
  onClose: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onPrint?: () => void;
}) {
  const checklistById = new Map(checklistItems.map((c) => [c.id, c]));

  return (
    <Modal title={`تقرير الاستلام — ${activityName}`} onClose={onClose}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xs text-ink-soft">مدير المشروع</div>
          <div className="text-sm font-semibold text-ink">{submission.managerName}</div>
          <div className="text-xs text-ink-soft mt-2">تاريخ التقديم</div>
          <div className="text-sm text-ink">{new Date(submission.createdAt).toLocaleDateString("ar-SA")}</div>
        </div>
        <DecisionStamp decision={submission.decision} size={84} />
      </div>

      {submission.notes && (
        <div className="mb-4">
          <div className="text-xs text-ink-soft mb-1">ملاحظات</div>
          <p className="text-sm text-ink bg-bg border border-line/60 rounded-lg p-3">{submission.notes}</p>
        </div>
      )}

      {submission.checklistResults.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-ink-soft mb-2">الاستلامات الفرعية</div>
          <div className="flex flex-col gap-2">
            {submission.checklistResults.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-sm">
                <span>{r.checked ? "✅" : "⬜"}</span>
                <span className="flex-1 text-ink">{r.checklistItemId ? checklistById.get(r.checklistItemId)?.text : ""}</span>
                {r.imageUrl && <img src={r.imageUrl} alt="" className="w-10 h-10 object-cover rounded border border-line" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {submission.images.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-ink-soft mb-2">صور إضافية</div>
          <div className="flex flex-wrap gap-2">
            {submission.images.map((url, i) => (
              <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-line" />
            ))}
          </div>
        </div>
      )}

      {submission.managerSignatureUrl && (
        <div className="mb-4">
          <div className="text-xs text-ink-soft mb-1">التوقيع</div>
          <img src={submission.managerSignatureUrl} alt="التوقيع" className="h-16 object-contain border border-line rounded-lg bg-white p-1" />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {onPrint && (
          <SecondaryButton onClick={onPrint} className="flex-1">
            طباعة / PDF
          </SecondaryButton>
        )}
        {onEdit && (
          <SecondaryButton onClick={onEdit} className="flex-1">
            تعديل
          </SecondaryButton>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="flex-1 py-2.5 rounded-lg border border-critical/40 text-critical bg-transparent font-semibold text-sm cursor-pointer"
          >
            حذف التقديم
          </button>
        )}
      </div>
      <SecondaryButton onClick={onClose} className="w-full mt-2">
        إغلاق
      </SecondaryButton>
    </Modal>
  );
}
