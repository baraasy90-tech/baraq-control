import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapApprovalChain, mapApprovalChainStep } from "@/features/procurement/api/mapMaterialRequest";
import type { ApprovalChain, ApprovalChainStep } from "@/types/domain";

export interface ApprovalChainBundle {
  chain: ApprovalChain;
  steps: ApprovalChainStep[];
}

/** كل سلاسل الاعتماد (الحالية والسابقة، لكل المراحل) لطلب مادة معيّن، مرتّبة زمنياً. */
export function useApprovalChains(materialRequestId: string | undefined) {
  return useQuery({
    queryKey: ["approval_chains", materialRequestId],
    enabled: !!materialRequestId,
    queryFn: async (): Promise<ApprovalChainBundle[]> => {
      const { data: chainRows, error } = await supabase
        .from("approval_chains")
        .select("*")
        .eq("material_request_id", materialRequestId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (chainRows.length === 0) return [];

      const chainIds = chainRows.map((c) => c.id);
      const { data: stepRows, error: stepsError } = await supabase
        .from("approval_chain_steps")
        .select("*")
        .in("chain_id", chainIds)
        .order("step_order", { ascending: true });
      if (stepsError) throw stepsError;

      return chainRows.map(mapApprovalChain).map((chain) => ({
        chain,
        steps: stepRows.filter((s) => s.chain_id === chain.id).map(mapApprovalChainStep),
      }));
    },
  });
}
