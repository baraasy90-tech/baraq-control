import type { Decision } from "@/types/domain";

export const DECISION_META: Record<Decision, { label: string; color: string; bg: string }> = {
  approved: { label: "معتمد نهائي", color: "text-ontrack", bg: "bg-ontrack-bg" },
  approvedWithNotes: { label: "معتمد بملاحظات", color: "text-warn", bg: "bg-warn-bg" },
  rejected: { label: "مرفوض", color: "text-critical", bg: "bg-critical-bg" },
};

export function getLatestDecision(submissions: { decision: Decision }[]): Decision | "notSubmitted" {
  if (submissions.length === 0) return "notSubmitted";
  return submissions[submissions.length - 1].decision;
}

export const NOT_SUBMITTED_META = { label: "لم يُقدَّم", color: "text-not-submitted", bg: "bg-not-submitted-bg" };
