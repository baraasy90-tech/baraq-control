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
  /** الأيام المنقضية منذ بداية سلسلة الاعتماد النشطة، أو null لو الطلب ليس بانتظار أحد. */
  daysAtCurrentStage: number | null;
}

function daysBetween(aIso: string, bIso: string): number {
  return Math.round((new Date(bIso).getTime() - new Date(aIso).getTime()) / 86400000);
}

function phaseOf(status: MaterialRequestStatus): MaterialApprovalPhase | null {
  if (status === "sample_pending") return "sample";
  if (status === "purchase_pending") return "purchase";
  return null;
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
      if (rows.length === 0) return [];

      const { data: chainRows, error: chainsError } = await supabase
        .from("approval_chains")
        .select("material_request_id, status, created_at")
        .in(
          "material_request_id",
          rows.map((r) => r.id)
        )
        .eq("status", "pending");
      if (chainsError) throw chainsError;
      const chainStartByRequest = new Map(chainRows.map((c) => [c.material_request_id, c.created_at]));

      const now = new Date().toISOString();
      return rows
        .map(mapMaterialRequest)
        .map((r): MaterialApprovalItem => {
          const stageStart = chainStartByRequest.get(r.id) ?? null;
          return {
            request: r,
            projectId: r.projectId,
            projectName: projectNameById.get(r.projectId) ?? "—",
            phase: phaseOf(r.status),
            daysAtCurrentStage: stageStart ? daysBetween(stageStart, now) : null,
          };
        })
        .sort((a, b) => (b.daysAtCurrentStage ?? -1) - (a.daysAtCurrentStage ?? -1));
    },
  });
}
