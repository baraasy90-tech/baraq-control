import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import type { BudgetReconciliationNote, ReconciliationKind, ReconciliationStatus } from "@/types/domain";

function mapNote(row: {
  id: string;
  project_id: string;
  contract_value: number | null;
  tracked_budget_value: number | null;
  note: string;
  created_by: string;
  created_at: string;
  status: ReconciliationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  kind: ReconciliationKind;
}): BudgetReconciliationNote {
  return {
    id: row.id,
    projectId: row.project_id,
    contractValue: row.contract_value,
    trackedBudgetValue: row.tracked_budget_value,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    kind: row.kind,
  };
}

export function useReconciliationNotes(projectId: string | undefined, kind: ReconciliationKind) {
  return useQuery({
    queryKey: ["budget-reconciliation-notes", projectId, kind],
    enabled: !!projectId,
    queryFn: async (): Promise<BudgetReconciliationNote[]> => {
      const { data, error } = await supabase
        .from("budget_reconciliation_notes")
        .select("*")
        .eq("project_id", projectId!)
        .eq("kind", kind)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(mapNote);
    },
  });
}

export interface AddReconciliationNoteInput {
  projectId: string;
  kind: ReconciliationKind;
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
        kind: input.kind,
        contract_value: input.contractValue,
        tracked_budget_value: input.trackedBudgetValue,
        note: input.note,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["budget-reconciliation-notes", input.projectId, input.kind] });
    },
  });
}

export interface ReviewReconciliationNoteInput {
  id: string;
  projectId: string;
  kind: ReconciliationKind;
  status: "approved" | "rejected";
  reviewNote: string | null;
}

export function useReviewReconciliationNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReviewReconciliationNoteInput) => {
      if (!user) throw new Error("not authenticated");
      const { error } = await supabase
        .from("budget_reconciliation_notes")
        .update({
          status: input.status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_note: input.reviewNote,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["budget-reconciliation-notes", input.projectId, input.kind] });
    },
  });
}
