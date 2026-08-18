import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export function useSubmitMaterialSample(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc("submit_material_sample", { p_request_id: requestId });
      if (error) throw error;
    },
    onSuccess: (_data, requestId) => {
      queryClient.invalidateQueries({ queryKey: ["material_request", requestId] });
      queryClient.invalidateQueries({ queryKey: ["material_requests", projectId] });
    },
  });
}

export function useReviewMaterialSample(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, approve, note }: { requestId: string; approve: boolean; note: string | null }) => {
      const { error } = await supabase.rpc("review_material_sample", {
        p_request_id: requestId,
        p_approve: approve,
        p_note: note,
      });
      if (error) throw error;
      return requestId;
    },
    onSuccess: (requestId) => {
      queryClient.invalidateQueries({ queryKey: ["material_request", requestId] });
      queryClient.invalidateQueries({ queryKey: ["material_requests", projectId] });
    },
  });
}

export function useSubmitMaterialPurchase(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc("submit_material_purchase", { p_request_id: requestId });
      if (error) throw error;
    },
    onSuccess: (_data, requestId) => {
      queryClient.invalidateQueries({ queryKey: ["material_request", requestId] });
      queryClient.invalidateQueries({ queryKey: ["material_requests", projectId] });
    },
  });
}

export function useReviewMaterialPurchase(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, approve, note }: { requestId: string; approve: boolean; note: string | null }) => {
      const { error } = await supabase.rpc("review_material_purchase", {
        p_request_id: requestId,
        p_approve: approve,
        p_note: note,
      });
      if (error) throw error;
      return requestId;
    },
    onSuccess: (requestId) => {
      queryClient.invalidateQueries({ queryKey: ["material_request", requestId] });
      queryClient.invalidateQueries({ queryKey: ["material_requests", projectId] });
    },
  });
}
