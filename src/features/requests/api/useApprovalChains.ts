import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapInternalApprovalChain, mapInternalApprovalChainStep } from "@/features/requests/api/mapInternalRequest";
import type { InternalApprovalChain, InternalApprovalChainStep } from "@/types/domain";

export interface InternalApprovalChainBundle {
  chain: InternalApprovalChain;
  steps: InternalApprovalChainStep[];
}

/** سلسلة الاعتماد الحالية (إن وُجدت) لطلب داخلي معيّن، مع كل خطواتها مرتّبة. */
export function useInternalApprovalChain(requestId: string | undefined) {
  return useQuery({
    queryKey: ["internal-approval-chain", requestId],
    enabled: !!requestId,
    queryFn: async (): Promise<InternalApprovalChainBundle | null> => {
      const { data: chainRows, error } = await supabase
        .from("internal_approval_chains")
        .select("*")
        .eq("internal_request_id", requestId!)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      if (chainRows.length === 0) return null;

      const chain = mapInternalApprovalChain(chainRows[0]);
      const { data: stepRows, error: stepsError } = await supabase
        .from("internal_approval_chain_steps")
        .select("*")
        .eq("chain_id", chain.id)
        .order("step_order", { ascending: true });
      if (stepsError) throw stepsError;

      return { chain, steps: stepRows.map(mapInternalApprovalChainStep) };
    },
  });
}
