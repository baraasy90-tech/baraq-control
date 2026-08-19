import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapMaterialRequest } from "@/features/procurement/api/mapMaterialRequest";
import type { MaterialRequest, MaterialRequestStatus } from "@/types/domain";

export type MaterialApprovalPhase = "sample" | "purchase";

export interface MaterialApprovalItem {
  request: MaterialRequest;
  projectId: string;
  projectName: string;
  phase: MaterialApprovalPhase | null;
  /** الأيام المنقضية منذ بداية المرحلة الحالية، أو null لو الطلب ليس بانتظار أحد. */
  daysAtCurrentStage: number | null;
}

function daysBetween(aIso: string, bIso: string): number {
  return Math.round((new Date(bIso).getTime() - new Date(aIso).getTime()) / 86400000);
}

function stageInfo(status: MaterialRequestStatus, r: MaterialRequest): { phase: MaterialApprovalPhase | null; stageStart: string | null } {
  switch (status) {
    case "sample_pending_pm_approval":
      return { phase: "sample", stageStart: r.sampleSubmittedAt };
    case "sample_pending_executive_approval":
      return { phase: "sample", stageStart: r.samplePmReviewedAt };
    case "purchase_pending_pm_approval":
      return { phase: "purchase", stageStart: r.purchaseSubmittedAt };
    case "purchase_pending_finance_approval":
      return { phase: "purchase", stageStart: r.purchasePmReviewedAt };
    default:
      return { phase: null, stageStart: null };
  }
}

/** كل طلبات المواد/المشتريات عبر مشاريع الشركة، مع تحديد المرحلة الحالية ومدتها —
 * ليتابعها مدير المشتريات دون فتح كل مشروع بمفرده. */
export function useCompanyMaterialRequests(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-material-requests", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<MaterialApprovalItem[]> => {
      const { data: projectRows, error: projectsError } = await supabase
        .from("projects")
        .select("id, name")
        .eq("company_id", companyId!);
      if (projectsError) throw projectsError;
      const projectIds = projectRows.map((p) => p.id);
      const projectNameById = new Map(projectRows.map((p) => [p.id, p.name]));
      if (projectIds.length === 0) return [];

      const { data: rows, error } = await supabase.from("material_requests").select("*").in("project_id", projectIds);
      if (error) throw error;

      const now = new Date().toISOString();
      return rows
        .map(mapMaterialRequest)
        .map((r): MaterialApprovalItem => {
          const { phase, stageStart } = stageInfo(r.status, r);
          return {
            request: r,
            projectId: r.projectId,
            projectName: projectNameById.get(r.projectId) ?? "—",
            phase,
            daysAtCurrentStage: stageStart ? daysBetween(stageStart, now) : null,
          };
        })
        .sort((a, b) => (b.daysAtCurrentStage ?? -1) - (a.daysAtCurrentStage ?? -1));
    },
  });
}
