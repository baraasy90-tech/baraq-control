import type { MaterialRequestStatus } from "@/types/domain";

export const MATERIAL_STATUS_LABEL: Record<MaterialRequestStatus, string> = {
  draft: "مسودة",
  sample_pending: "العينة: بانتظار الاعتماد",
  sample_approved: "العينة معتمدة",
  sample_rejected: "العينة مرفوضة",
  purchase_pending: "الشراء: بانتظار الاعتماد",
  purchase_approved: "معتمد للصرف",
  purchase_rejected: "الشراء مرفوض",
};

export const MATERIAL_STATUS_TONE: Record<MaterialRequestStatus, string> = {
  draft: "text-ink-soft bg-bg",
  sample_pending: "text-warn bg-warn-bg",
  sample_approved: "text-accent bg-accent-bg",
  sample_rejected: "text-critical bg-critical-bg",
  purchase_pending: "text-warn bg-warn-bg",
  purchase_approved: "text-accent bg-accent-bg",
  purchase_rejected: "text-critical bg-critical-bg",
};
