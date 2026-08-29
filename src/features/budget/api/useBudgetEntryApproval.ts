import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export function useSubmitBudgetEntry(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.rpc("submit_budget_entry", { p_entry_id: entryId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", projectId] });
    },
  });
}

export function useReviewBudgetEntry(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, approve, note }: { entryId: string; approve: boolean; note: string | null }) => {
      const { error } = await supabase.rpc("review_budget_entry", { p_entry_id: entryId, p_approve: approve, p_note: note });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", projectId] });
    },
  });
}

export function useResetBudgetEntryToDraft(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.rpc("reset_budget_entry_to_draft", { p_entry_id: entryId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", projectId] });
    },
  });
}
