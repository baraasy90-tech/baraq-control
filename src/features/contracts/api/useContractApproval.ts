import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

export function useSubmitContract() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contractId, projectId }: { contractId: string; projectId: string }) => {
      if (!user) throw new Error("not authenticated");
      const { error } = await supabase
        .from("contracts")
        .update({ status: "pending_approval", submitted_by: user.id, submitted_at: new Date().toISOString() })
        .eq("id", contractId);
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
