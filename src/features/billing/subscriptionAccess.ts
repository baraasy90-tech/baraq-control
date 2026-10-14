import { supabase } from "@/lib/supabase/client";
import type { PolicyStage } from "./subscriptionPolicy";
export interface SubscriptionAccess {
  enabled: boolean; stage: Exclude<PolicyStage, "invalid">; can_write: boolean;
  export_notice: string | null; trial_ends_at: string; grace_ends_at: string; server_now: string;
}
export async function getSubscriptionAccess(companyId?: string, projectId?: string): Promise<SubscriptionAccess> {
  const { data, error } = await (projectId ? supabase.rpc("get_project_subscription_policy", {p_project_id: projectId}) : supabase.rpc("get_company_subscription_policy", companyId ? {p_company_id: companyId} : {}));
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data) || typeof data.enabled !== "boolean" || typeof data.can_write !== "boolean" || typeof data.stage !== "string") throw new Error("تعذّر التحقق من حالة الاشتراك");
  return data as unknown as SubscriptionAccess;
}
export async function getExportNotice(projectId?: string): Promise<string | null> {
  // Read fresh server policy at export time; do not trust a cached client clock.
  return (await getSubscriptionAccess(undefined, projectId)).export_notice;
}
