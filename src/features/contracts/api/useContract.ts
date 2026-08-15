import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapContract, mapDeduction, mapLineItem, mapPayment } from "@/features/contracts/api/mapContract";
import type { Contract, ContractDeduction, ContractLineItem, ContractPayment } from "@/types/domain";

export interface ContractBundle {
  contract: Contract;
  lineItems: ContractLineItem[];
  payments: ContractPayment[];
  deductions: ContractDeduction[];
}

export function useContract(projectId: string | undefined) {
  return useQuery({
    queryKey: ["contract", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ContractBundle | null> => {
      const { data: contractRow, error: contractError } = await supabase
        .from("contracts")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (contractError) throw contractError;
      if (!contractRow) return null;

      const contract = mapContract(contractRow);

      const [lineItemsRes, paymentsRes, deductionsRes] = await Promise.all([
        supabase.from("contract_line_items").select("*").eq("contract_id", contract.id).order("order", { ascending: true }),
        supabase.from("contract_payments").select("*").eq("contract_id", contract.id).order("order", { ascending: true }),
        supabase.from("contract_deductions").select("*").eq("contract_id", contract.id).order("deducted_at", { ascending: false }),
      ]);
      if (lineItemsRes.error) throw lineItemsRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (deductionsRes.error) throw deductionsRes.error;

      return {
        contract,
        lineItems: lineItemsRes.data.map(mapLineItem),
        payments: paymentsRes.data.map(mapPayment),
        deductions: deductionsRes.data.map(mapDeduction),
      };
    },
  });
}
