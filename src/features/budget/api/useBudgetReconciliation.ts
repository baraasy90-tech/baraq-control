import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import type { BudgetReconciliationNote } from "@/types/domain";

function mapNote(row: {
  id: string;
  project_id: string;
  contract_value: number | null;
  tracked_budget_value: number | null;
  note: string;
  created_by: string;
  created_at: string;
}): BudgetReconciliationNote {
  return {
    id: row.id,
    projectId: row.project_id,
    contractValue: row.contract_value,
    trackedBudgetValue: row.tracked_budget_value,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function useReconciliationNotes(projectId: string | undefined) {
  return useQuery({
    queryKey: ["budget-reconciliation-notes", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<BudgetReconciliationNote[]> => {
      const { data, error } = await supabase
        .from("budget_reconciliation_notes")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(mapNote);
    },
  });
}

export interface AddReconciliationNoteInput {
  projectId: string;
  contractValue: number | null;
  trackedBudgetValue: number | null;
  note: string;
}

export function useAddReconciliationNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddReconciliationNoteInput) => {
      if (!user) throw new Error("not authenticated");
      const { error } = await supabase.from("budget_reconciliation_notes").insert({
        project_id: input.projectId,
        contract_value: input.contractValue,
        tracked_budget_value: input.trackedBudgetValue,
        note: input.note,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["budget-reconciliation-notes", input.projectId] });
    },
  });
}
