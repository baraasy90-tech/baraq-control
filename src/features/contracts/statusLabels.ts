import type { ContractStatus, PaymentApprovalStatus } from "@/types/domain";

export const STATUS_LABEL: Record<ContractStatus, string> = {
  draft: "مسودة",
  pending_approval: "بانتظار الاعتماد",
  approved: "معتمد",
  rejected: "مرفوض",
};

export const STATUS_TONE: Record<ContractStatus, string> = {
  draft: "text-ink-soft bg-bg",
  pending_approval: "text-warn bg-warn-bg",
  approved: "text-accent bg-accent-bg",
  rejected: "text-critical bg-critical-bg",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentApprovalStatus, string> = {
  pending: "قيد الإعداد",
  submitted: "مُقدَّمة للاعتماد",
  approved: "معتمدة",
  rejected: "مرفوضة",
};

export const PAYMENT_STATUS_TONE: Record<PaymentApprovalStatus, string> = {
  pending: "text-ink-soft bg-bg",
  submitted: "text-warn bg-warn-bg",
  approved: "text-accent bg-accent-bg",
  rejected: "text-critical bg-critical-bg",
};
