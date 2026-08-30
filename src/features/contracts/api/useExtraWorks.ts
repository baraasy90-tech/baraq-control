import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { mapExtraWork } from "@/features/contracts/api/mapExtraWork";
import type { ContractExtraWork } from "@/types/domain";

export function useExtraWorks(contractId: string | undefined) {
  return useQuery({
    queryKey: ["contract-extra-works", contractId],
    enabled: !!contractId,
    queryFn: async (): Promise<ContractExtraWork[]> => {
      const { data, error } = await supabase
        .from("contract_extra_works")
        .select("*")
        .eq("contract_id", contractId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data.map(mapExtraWork);
    },
  });
}

export function useCreateExtraWork(contractId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: { title: string; description: string | null; amount: number; autoApprove?: boolean }) => {
      if (!user || !contractId) throw new Error("not ready");
      const { error } = await supabase.from("contract_extra_works").insert({
        contract_id: contractId,
        title: values.title,
        description: values.description,
        amount: values.amount,
        created_by: user.id,
        status: values.autoApprove ? "approved" : undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-extra-works", contractId] });
    },
  });
}

export function useSubmitExtraWork(contractId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (extraWorkId: string) => {
      const { error } = await supabase.rpc("submit_contract_extra_work", { p_extra_work_id: extraWorkId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-extra-works", contractId] });
    },
  });
}

export function useReviewExtraWork(contractId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ extraWorkId, approve, note }: { extraWorkId: string; approve: boolean; note: string | null }) => {
      const { error } = await supabase.rpc("review_contract_extra_work", {
        p_extra_work_id: extraWorkId,
        p_approve: approve,
        p_note: note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-extra-works", contractId] });
    },
  });
}

export function useDeleteExtraWork(contractId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (extraWorkId: string) => {
      const { error } = await supabase.from("contract_extra_works").delete().eq("id", extraWorkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-extra-works", contractId] });
    },
  });
}
