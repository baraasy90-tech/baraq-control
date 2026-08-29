import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
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
 * منفصلان + ربط بالذاكرة (بنفس أسلوب بقية الـ hooks بالمشروع) بدل join مضمَّن، لأن
 * database.types.ts هنا مكتوب يدوياً بلا بيانات Relationships تُمكِّن عميل Supabase
 * من كشف الربط تلقائياً. */
export function useContractPaymentsForProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ["contract-payments-for-project", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectContractPayment[]> => {
      const { data: contracts, error: contractsError } = await supabase
        .from("contracts")
        .select("id, contract_name, has_advance_payment, advance_deduction_percentage, retention_percentage")
        .eq("project_id", projectId!);
      if (contractsError) throw contractsError;
      if (contracts.length === 0) return [];

      const contractIds = contracts.map((c) => c.id);
      const { data: payments, error: paymentsError } = await supabase
        .from("contract_payments")
        .select("*")
        .in("contract_id", contractIds)
        .order("order", { ascending: true });
      if (paymentsError) throw paymentsError;

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
