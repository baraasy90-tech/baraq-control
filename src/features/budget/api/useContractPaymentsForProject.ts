import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { fetchAllRows, fetchRowsByIds } from "@/lib/supabase/fetchAllRows";
import { mapPayment } from "@/features/contracts/api/mapContract";
import type { ContractPayment } from "@/types/domain";

export interface ProjectContractPayment extends ContractPayment {
  contractName: string;
  contractHasAdvancePayment: boolean;
  contractAdvanceDeductionPercentage: number | null;
  contractRetentionPercentage: number | null;
}

/** كل دفعات كل عقود المشروع (بغض النظر عن أي نشاط جدولة) — تُستخدم لربط دفعة فعلية
 * بالميزانية بدفعة عقد حقيقية بدل نص حر، ولحساب "إجمالي المدفوع فعلياً من العقود"
 * (تحتاج نسب الدفعة المقدمة/الضمان من العقد نفسه لحساب صافي كل دفعة). استعلامان
 * منفصلان مع صفحات محددة وربط بالذاكرة، لضمان قراءة كل الدفعات مهما زاد عدد العقود. */
export function useContractPaymentsForProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ["contract-payments-for-project", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectContractPayment[]> => {
      const contracts = await fetchAllRows((from, to) => supabase
        .from("contracts")
        .select("id, contract_name, has_advance_payment, advance_deduction_percentage, retention_percentage")
        .eq("project_id", projectId!).order("id").range(from, to));
      if (contracts.length === 0) return [];

      const contractIds = contracts.map((c) => c.id);
      const payments = await fetchRowsByIds(contractIds, (ids, from, to) => supabase
        .from("contract_payments")
        .select("*")
        .in("contract_id", ids)
        .order("order", { ascending: true }).order("id").range(from, to));

      const contractById = new Map(contracts.map((c) => [c.id, c]));
      return payments.map((row) => {
        const contract = contractById.get(row.contract_id)!;
        return {
          ...mapPayment(row),
          contractName: contract.contract_name,
          contractHasAdvancePayment: contract.has_advance_payment,
          contractAdvanceDeductionPercentage: contract.advance_deduction_percentage,
          contractRetentionPercentage: contract.retention_percentage,
        };
      });
    },
  });
}
