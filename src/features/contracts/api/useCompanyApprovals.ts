import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { ContractStatus, PaymentApprovalStatus } from "@/types/domain";

export type ApprovalKind = "contract" | "payment";
export type ApprovalStatus = ContractStatus | PaymentApprovalStatus;

export interface ApprovalItem {
  id: string;
  kind: ApprovalKind;
  title: string;
  contractId: string;
  contractName: string;
  projectId: string;
  projectName: string;
  status: ApprovalStatus;
  submittedAt: string | null;
  pmReviewedAt: string | null;
  financeReviewedAt: string | null;
  /** الأيام المنقضية بالمرحلة الحالية — من بداية هذه المرحلة وحتى الآن، أو null لو لم تعد بانتظار أحد. */
  daysAtCurrentStage: number | null;
  /** كم يوماً استغرقت مرحلة اعتماد إدارة المشاريع فعلياً (بعد اكتمالها) — لتحديد المسؤول عن التأخير لاحقاً. */
  pmStageDays: number | null;
  /** كم يوماً استغرقت مرحلة الاعتماد المالي فعلياً (بعد اكتمالها). */
  financeStageDays: number | null;
}

function daysBetween(aIso: string, bIso: string): number {
  return Math.round((new Date(bIso).getTime() - new Date(aIso).getTime()) / 86400000);
}

function buildItem(base: Omit<ApprovalItem, "daysAtCurrentStage" | "pmStageDays" | "financeStageDays">): ApprovalItem {
  const now = new Date().toISOString();
  const currentStageStart =
    base.status === "pending_pm_approval"
      ? base.submittedAt
      : base.status === "pending_finance_approval"
        ? base.pmReviewedAt
        : null;

  return {
    ...base,
    daysAtCurrentStage: currentStageStart ? daysBetween(currentStageStart, now) : null,
    pmStageDays: base.submittedAt && base.pmReviewedAt ? daysBetween(base.submittedAt, base.pmReviewedAt) : null,
    financeStageDays: base.pmReviewedAt && base.financeReviewedAt ? daysBetween(base.pmReviewedAt, base.financeReviewedAt) : null,
  };
}

/** كل معاملات الاعتماد (عقود + دفعات) عبر مشاريع الشركة، مع حساب مدة كل مرحلة — لتتبع
 * أين تتعطل المعاملات ومسؤولية التأخير (إدارة المشاريع أم المالية). */
export function useCompanyApprovals(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-approvals", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<ApprovalItem[]> => {
      const { data: projectRows, error: projectsError } = await supabase
        .from("projects")
        .select("id, name")
        .eq("company_id", companyId!);
      if (projectsError) throw projectsError;
      const projectIds = projectRows.map((p) => p.id);
      const projectNameById = new Map(projectRows.map((p) => [p.id, p.name]));
      if (projectIds.length === 0) return [];

      const { data: contractRows, error: contractsError } = await supabase
        .from("contracts")
        .select("id, project_id, contract_name, status, submitted_at, pm_reviewed_at, finance_reviewed_at")
        .in("project_id", projectIds);
      if (contractsError) throw contractsError;

      const contractIds = contractRows.map((c) => c.id);
      const { data: paymentRows, error: paymentsError } =
        contractIds.length > 0
          ? await supabase
              .from("contract_payments")
              .select("id, contract_id, title, status, submitted_at, pm_reviewed_at, finance_reviewed_at")
              .in("contract_id", contractIds)
          : { data: [] as never[], error: null };
      if (paymentsError) throw paymentsError;

      const contractById = new Map(contractRows.map((c) => [c.id, c]));

      const items: ApprovalItem[] = [];

      for (const c of contractRows) {
        items.push(
          buildItem({
            id: c.id,
            kind: "contract",
            title: c.contract_name,
            contractId: c.id,
            contractName: c.contract_name,
            projectId: c.project_id,
            projectName: projectNameById.get(c.project_id) ?? "—",
            status: c.status,
            submittedAt: c.submitted_at,
            pmReviewedAt: c.pm_reviewed_at,
            financeReviewedAt: c.finance_reviewed_at,
          })
        );
      }

      for (const p of paymentRows) {
        const contract = contractById.get(p.contract_id);
        if (!contract) continue;
        items.push(
          buildItem({
            id: p.id,
            kind: "payment",
            title: p.title,
            contractId: contract.id,
            contractName: contract.contract_name,
            projectId: contract.project_id,
            projectName: projectNameById.get(contract.project_id) ?? "—",
            status: p.status,
            submittedAt: p.submitted_at,
            pmReviewedAt: p.pm_reviewed_at,
            financeReviewedAt: p.finance_reviewed_at,
          })
        );
      }

      return items.sort((a, b) => (b.daysAtCurrentStage ?? -1) - (a.daysAtCurrentStage ?? -1));
    },
  });
}
