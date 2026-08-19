import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export function useSubmitSettlement(contractId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note: string | null) => {
      if (!contractId) throw new Error("not ready");
      const { error } = await supabase.rpc("submit_contract_settlement", { p_contract_id: contractId, p_note: note });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract", contractId] });
    },
  });
}

export function useReviewSettlement(contractId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ approve, note }: { approve: boolean; note: string | null }) => {
      if (!contractId) throw new Error("not ready");
      const { error } = await supabase.rpc("review_contract_settlement", {
        p_contract_id: contractId,
        p_approve: approve,
        p_note: note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract", contractId] });
    },
  });
}
