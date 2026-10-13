import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import { mapContract, mapDeduction, mapLineItem, mapPayment } from "@/features/contracts/api/mapContract";
import type { Contract, ContractDeduction, ContractLineItem, ContractPayment } from "@/types/domain";

/** كل عقود المشروع (قد يكون له أكثر من عقد: عظم، تشطيبات، مصاعد...). */
export function useContracts(projectId: string | undefined) {
  return useQuery({
    queryKey: ["contracts", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<Contract[]> => {
      const data = await fetchAllRows((from, to) => supabase
        .from("contracts")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: true }).order("id").range(from, to));
      return data.map(mapContract);
    },
  });
}

export interface ContractBundle {
  contract: Contract;
  lineItems: ContractLineItem[];
  payments: ContractPayment[];
  deductions: ContractDeduction[];
}

export function useContract(contractId: string | undefined) {
  return useQuery({
    queryKey: ["contract", contractId],
    enabled: !!contractId,
    queryFn: async (): Promise<ContractBundle | null> => {
      const { data: contractRow, error: contractError } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", contractId!)
        .maybeSingle();
      if (contractError) throw contractError;
      if (!contractRow) return null;

      const contract = mapContract(contractRow);

      const [lineItemsRes, paymentsRes, deductionsRes] = await Promise.all([
        fetchAllRows((from, to) => supabase.from("contract_line_items").select("*").eq("contract_id", contract.id).order("order", { ascending: true }).order("id").range(from, to)),
        fetchAllRows((from, to) => supabase.from("contract_payments").select("*").eq("contract_id", contract.id).order("order", { ascending: true }).order("id").range(from, to)),
        fetchAllRows((from, to) => supabase.from("contract_deductions").select("*").eq("contract_id", contract.id).order("deducted_at", { ascending: false }).order("id").range(from, to)),
      ]);

      return {
        contract,
        lineItems: lineItemsRes.map(mapLineItem),
        payments: paymentsRes.map(mapPayment),
        deductions: deductionsRes.map(mapDeduction),
      };
    },
  });
}
