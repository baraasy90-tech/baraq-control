import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { uploadFile, uniqueFileName } from "@/lib/supabase/storage";
import { useAuth } from "@/features/auth/AuthContext";

export interface SaveContractInput {
  id?: string;
  projectId: string;
  name: string;
  pdfFile?: File | null;
  startDate: string | null;
  durationDays: number | null;
  totalValue: number | null;
  paymentTerms: string | null;
  hasAdvancePayment: boolean;
  advancePaymentPercentage: number | null;
  advancePaymentGuaranteeNote: string | null;
  advanceDeductionPercentage: number | null;
  retentionPercentage: number | null;
  retentionReleased: boolean;
  retentionReleaseNote: string | null;
}

export function useSaveContract() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveContractInput) => {
      let pdfUrl: string | undefined;
      if (input.pdfFile) {
        if (!user) throw new Error("not authenticated");
        pdfUrl = await uploadFile("documents", `${user.id}/${uniqueFileName(input.pdfFile.name)}`, input.pdfFile);
      }

      const payload = {
        project_id: input.projectId,
        contract_name: input.name,
        ...(pdfUrl ? { pdf_url: pdfUrl } : {}),
        start_date: input.startDate,
        duration_days: input.durationDays,
        total_value: input.totalValue,
        payment_terms: input.paymentTerms,
        has_advance_payment: input.hasAdvancePayment,
        advance_payment_percentage: input.advancePaymentPercentage,
        advance_payment_guarantee_note: input.advancePaymentGuaranteeNote,
        advance_deduction_percentage: input.advanceDeductionPercentage,
        retention_percentage: input.retentionPercentage,
        retention_released: input.retentionReleased,
        retention_release_note: input.retentionReleaseNote,
      };

      if (input.id) {
        const { error } = await supabase.from("contracts").update(payload).eq("id", input.id);
        if (error) throw error;
        return { id: input.id };
      } else {
        const { data, error } = await supabase.from("contracts").insert(payload).select("id").single();
        if (error) throw error;
        return { id: data.id };
      }
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["contracts", input.projectId] });
      queryClient.invalidateQueries({ queryKey: ["contract", _data.id] });
    },
  });
}
