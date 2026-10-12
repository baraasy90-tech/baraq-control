import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { uploadFile, uniqueFileName } from "@/lib/supabase/storage";
import { useAuth } from "@/features/auth/AuthContext";
import { createFileUploadCache } from "@/lib/supabase/fileUploadCache";

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
  vatInclusive: boolean;
  vatRate: number | null;
  resetToDraft?: boolean;
}

export function useSaveContract() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const draftId = useRef(crypto.randomUUID());
  const [uploadPdf] = useState(() => createFileUploadCache<File>(file => {
    if (!user) return Promise.reject(new Error("يلزم تسجيل الدخول"));
    return uploadFile("documents", `${user.id}/${uniqueFileName(file.name)}`, file);
  }));

  return useMutation({
    mutationFn: async (input: SaveContractInput) => {
      let pdfUrl: string | undefined;
      if (input.pdfFile) {
        if (!user) throw new Error("not authenticated");
        pdfUrl = await uploadPdf(input.pdfFile);
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
        vat_inclusive: input.vatInclusive,
        vat_rate: input.vatRate,
      };

      const {data,error}=await supabase.rpc("save_contract_atomic",{
        p_id:input.id??draftId.current,p_create:!input.id,p_reset_to_draft:input.resetToDraft??false,p_data:payload,
      });
      if(error){
        if(error.message.includes("الملف غير موجود"))uploadPdf.clear();
        throw error;
      }
      return {id:data};
    },
    onSuccess: (_data, input) => {
      if (!input.id) draftId.current = crypto.randomUUID();
      queryClient.invalidateQueries({ queryKey: ["contracts", input.projectId] });
      queryClient.invalidateQueries({ queryKey: ["contract", _data.id] });
      queryClient.invalidateQueries({ queryKey: ["activities", input.projectId] });
    },
  });
}
