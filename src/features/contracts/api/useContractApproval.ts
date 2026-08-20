import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export function useSubmitContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contractId, projectId }: { contractId: string; projectId: string }) => {
      const { error } = await supabase.rpc("submit_contract", { p_contract_id: contractId });
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["contract", vars.contractId] });
      queryClient.invalidateQueries({ queryKey: ["contracts", data.projectId] });
    },
  });
}

export function useReviewContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contractId,
      projectId,
      approve,
      note,
    }: {
      contractId: string;
      projectId: string;
      approve: boolean;
      note: string | null;
    }) => {
      const { error } = await supabase.rpc("review_contract", {
        p_contract_id: contractId,
        p_approve: approve,
        p_note: note,
      });
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["contract", vars.contractId] });
      queryClient.invalidateQueries({ queryKey: ["contracts", data.projectId] });
    },
  });
}

export function useSubmitPayment(contractId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase.rpc("submit_contract_payment", { p_payment_id: paymentId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract", contractId] });
    },
  });
}

export function useReviewPayment(contractId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, approve, note }: { paymentId: string; approve: boolean; note: string | null }) => {
      const { error } = await supabase.rpc("review_contract_payment", {
        p_payment_id: paymentId,
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
