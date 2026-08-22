import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

function invalidateRequest(queryClient: ReturnType<typeof useQueryClient>, requestId: string) {
  queryClient.invalidateQueries({ queryKey: ["internal-approval-chain", requestId] });
  queryClient.invalidateQueries({ queryKey: ["my-internal-requests"] });
  queryClient.invalidateQueries({ queryKey: ["company-internal-requests"] });
}

export function useRouteInternalApprovalStep(requestId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stepId, userId }: { stepId: string; userId: string }) => {
      const { error } = await supabase.rpc("route_internal_approval_step", { p_step_id: stepId, p_user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      if (requestId) invalidateRequest(queryClient, requestId);
    },
  });
}

export function useInsertInternalApprovalStep(requestId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      stepId,
      departmentId,
      userId,
      note,
    }: {
      stepId: string;
      departmentId: string | null;
      userId: string | null;
      note: string | null;
    }) => {
      const { error } = await supabase.rpc("insert_internal_approval_step", {
        p_step_id: stepId,
        p_department_id: departmentId,
        p_user_id: userId,
        p_note: note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (requestId) invalidateRequest(queryClient, requestId);
    },
  });
}

export function useReviewInternalApprovalStep(requestId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stepId, approve, note }: { stepId: string; approve: boolean; note: string | null }) => {
      const { error } = await supabase.rpc("review_internal_approval_step", { p_step_id: stepId, p_approve: approve, p_note: note });
      if (error) throw error;
    },
    onSuccess: () => {
      if (requestId) invalidateRequest(queryClient, requestId);
    },
  });
}

export function useSendBackInternalApprovalStep(requestId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stepId, targetStepId, note }: { stepId: string; targetStepId: string; note: string }) => {
      const { error } = await supabase.rpc("send_back_internal_approval_step", {
        p_step_id: stepId,
        p_target_step_id: targetStepId,
        p_note: note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (requestId) invalidateRequest(queryClient, requestId);
    },
  });
}
