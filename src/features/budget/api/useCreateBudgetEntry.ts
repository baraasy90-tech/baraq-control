import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export interface CreateBudgetEntryInput {
  activityId: string;
  projectId: string;
  date: string;
  amount: number;
  source: string;
  note: string | null;
  contractRef: string | null;
  contractPaymentId?: string | null;
  /** الحسابات الفردية بلا سلسلة اعتماد (لا مدير مشاريع/مالية غير صاحب الحساب نفسه) — تُعتمد الدفعة مباشرة. */
  autoApprove?: boolean;
}

export function useCreateBudgetEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBudgetEntryInput) => {
      const { error } = await supabase.from("budget_actual_entries").insert({
        activity_id: input.activityId,
        date: input.date,
        amount: input.amount,
        source: input.source,
        note: input.note,
        contract_ref: input.contractRef,
        contract_payment_id: input.contractPaymentId ?? null,
        status: input.autoApprove ? "approved" : undefined,
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["activities", input.projectId] });
    },
  });
}
