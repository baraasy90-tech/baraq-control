import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export interface ChainStepInput {
  departmentId: string | null;
  userId: string | null;
}

function toStepsJson(steps: ChainStepInput[]) {
  return steps.map((s) => ({ department_id: s.departmentId, user_id: s.userId }));
}

function invalidateRequest(queryClient: ReturnType<typeof useQueryClient>, requestId: string, projectId: string | undefined) {
  queryClient.invalidateQueries({ queryKey: ["material_request", requestId] });
  queryClient.invalidateQueries({ queryKey: ["material_requests", projectId] });
  queryClient.invalidateQueries({ queryKey: ["approval_chains", requestId] });
}

export function useSubmitMaterialSourcing(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, note }: { requestId: string; note: string | null }) => {
      const { error } = await supabase.rpc("submit_material_sourcing", { p_request_id: requestId, p_note: note });
      if (error) throw error;
      return requestId;
    },
    onSuccess: (requestId) => invalidateRequest(queryClient, requestId, projectId),
  });
}

export function useSubmitPurchaseChain(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, steps, note }: { requestId: string; steps: ChainStepInput[]; note: string | null }) => {
      const { error } = await supabase.rpc("submit_material_purchase_chain", {
        p_request_id: requestId,
        p_steps: toStepsJson(steps),
        p_note: note,
      });
      if (error) throw error;
      return requestId;
    },
    onSuccess: (requestId) => invalidateRequest(queryClient, requestId, projectId),
  });
}

export function useRouteApprovalStep(requestId: string | undefined, projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stepId, userId }: { stepId: string; userId: string }) => {
      const { error } = await supabase.rpc("route_approval_step", { p_step_id: stepId, p_user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      if (requestId) invalidateRequest(queryClient, requestId, projectId);
    },
  });
}

export function useInsertApprovalStep(requestId: string | undefined, projectId: string | undefined) {
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
      const { error } = await supabase.rpc("insert_approval_step", {
        p_step_id: stepId,
        p_department_id: departmentId,
        p_user_id: userId,
        p_note: note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (requestId) invalidateRequest(queryClient, requestId, projectId);
    },
  });
}

export function useReviewApprovalStep(requestId: string | undefined, projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stepId, approve, note }: { stepId: string; approve: boolean; note: string | null }) => {
      const { error } = await supabase.rpc("review_approval_step", { p_step_id: stepId, p_approve: approve, p_note: note });
      if (error) throw error;
    },
    onSuccess: () => {
      if (requestId) invalidateRequest(queryClient, requestId, projectId);
    },
  });
}
