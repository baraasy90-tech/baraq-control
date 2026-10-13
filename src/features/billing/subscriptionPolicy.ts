import type { SubscriptionStatus } from "@/types/domain";

export type PolicyStage = "active" | "trial" | "grace" | "read_only" | "canceled" | "invalid";
const DAY = 86400000;
// Preview only until server-side write restrictions and export marking are released.
// A month of grace is defined explicitly as 30 elapsed days, including leap years.
export function previewSubscriptionPolicy(status: SubscriptionStatus, endsAt: string, now = Date.now()): { stage: PolicyStage; daysRemaining: number; graceEndsAt: string | null } {
  if (status === "active") return { stage: "active", daysRemaining: 0, graceEndsAt: null };
  if (status === "canceled") return { stage: "canceled", daysRemaining: 0, graceEndsAt: null };
  const end = Date.parse(endsAt);
  if (!Number.isFinite(end) || !Number.isFinite(now)) return { stage: "invalid", daysRemaining: 0, graceEndsAt: null };
  const graceEnd = end + 30 * DAY;
  if (status === "trial" && now < end) return { stage: "trial", daysRemaining: Math.ceil((end - now) / DAY), graceEndsAt: new Date(graceEnd).toISOString() };
  if (now < graceEnd) return { stage: "grace", daysRemaining: Math.ceil((graceEnd - now) / DAY), graceEndsAt: new Date(graceEnd).toISOString() };
  return { stage: "read_only", daysRemaining: 0, graceEndsAt: new Date(graceEnd).toISOString() };
}
export const POLICY_LABELS: Record<PolicyStage, string> = {
  active: "اشتراك نشط", trial: "داخل التجربة", grace: "مهلة سماح 30 يوماً",
  read_only: "قراءة فقط بعد انتهاء المهلة", canceled: "اشتراك ملغى", invalid: "راجع تاريخ الانتهاء",
};
