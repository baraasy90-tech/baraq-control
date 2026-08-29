import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapBudgetEntry } from "@/features/budget/api/mapBudgetEntry";
import type { BudgetActualEntry } from "@/types/domain";

export interface BudgetEntryApprovalItem {
  entry: BudgetActualEntry;
  activityName: string;
  projectId: string;
  projectName: string;
  /** الأيام المنقضية منذ بداية المرحلة الحالية، أو null لو الدفعة ليست بانتظار أحد. */
  daysAtCurrentStage: number | null;
}

function daysBetween(aIso: string, bIso: string): number {
  return Math.round((new Date(bIso).getTime() - new Date(aIso).getTime()) / 86400000);
}

/** كل الدفعات الفعلية بالميزانية (غير المسودة) عبر مشاريع الشركة — لمتابعتها من شاشة
 * الاعتمادات المركزية دون فتح كل مشروع/بند بمفرده، بنفس نمط useCompanyMaterialRequests. */
export function useCompanyBudgetEntryApprovals(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-budget-entry-approvals", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<BudgetEntryApprovalItem[]> => {
      const { data: projectRows, error: projectsError } = await supabase
        .from("projects")
        .select("id, name")
        .eq("company_id", companyId!);
      if (projectsError) throw projectsError;
      const projectIds = projectRows.map((p) => p.id);
      const projectNameById = new Map(projectRows.map((p) => [p.id, p.name]));
      if (projectIds.length === 0) return [];

      const { data: activityRows, error: activitiesError } = await supabase
        .from("activities")
        .select("id, project_id, name")
        .in("project_id", projectIds);
      if (activitiesError) throw activitiesError;
      const activityIds = activityRows.map((a) => a.id);
      const activityById = new Map(activityRows.map((a) => [a.id, a]));
      if (activityIds.length === 0) return [];

      const { data: entryRows, error: entriesError } = await supabase
        .from("budget_actual_entries")
        .select("*")
        .in("activity_id", activityIds)
        .neq("status", "draft");
      if (entriesError) throw entriesError;

      const now = new Date().toISOString();
      return entryRows
        .map(mapBudgetEntry)
        .map((entry): BudgetEntryApprovalItem | null => {
          const activity = activityById.get(entry.activityId);
          if (!activity) return null;
          const stageStart =
            entry.status === "pending_pm_approval" ? entry.submittedAt : entry.status === "pending_finance_approval" ? entry.pmReviewedAt : null;
          return {
            entry,
            activityName: activity.name,
            projectId: activity.project_id,
            projectName: projectNameById.get(activity.project_id) ?? "—",
            daysAtCurrentStage: stageStart ? daysBetween(stageStart, now) : null,
          };
        })
        .filter((item): item is BudgetEntryApprovalItem => item !== null)
        .sort((a, b) => (b.daysAtCurrentStage ?? -1) - (a.daysAtCurrentStage ?? -1));
    },
  });
}
