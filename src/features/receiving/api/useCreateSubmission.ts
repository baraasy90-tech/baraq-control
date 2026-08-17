import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Decision } from "@/types/domain";

export interface CreateSubmissionInput {
  activityId: string;
  projectId: string;
  managerName: string;
  managerSignatureUrl: string | null;
  decision: Decision;
  notes: string | null;
  checklistResults: { checklistItemId: string; checked: boolean; imageUrl: string | null }[];
  images: string[];
}

export function useCreateSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSubmissionInput) => {
      const { data: submission, error } = await supabase
        .from("submissions")
        .insert({
          activity_id: input.activityId,
          manager_name: input.managerName,
          manager_signature_url: input.managerSignatureUrl,
          decision: input.decision,
          notes: input.notes,
        })
        .select()
        .single();
      if (error) throw error;

      if (input.checklistResults.length > 0) {
        const { error: resultsError } = await supabase.from("checklist_results").insert(
          input.checklistResults.map((r) => ({
            submission_id: submission.id,
            checklist_item_id: r.checklistItemId,
            checked: r.checked,
            image_url: r.imageUrl,
          }))
        );
        if (resultsError) throw resultsError;
      }

      if (input.images.length > 0) {
        const { error: imagesError } = await supabase.from("submission_images").insert(
          input.images.map((url) => ({ submission_id: submission.id, image_url: url }))
        );
        if (imagesError) throw imagesError;
      }

      if (input.decision === "approved") {
        // نسجّل تاريخ الانتهاء الفعلي تلقائياً عند الاعتماد النهائي — فقط لو لم يُسجَّل من قبل،
        // حتى لا نطمس تصحيحاً يدوياً سابقاً لو تكرر الاعتماد.
        await supabase
          .from("activities")
          .update({ actual_end_date: new Date().toISOString().slice(0, 10) })
          .eq("id", input.activityId)
          .is("actual_end_date", null);
      }

      return submission;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["activities", input.projectId] });
    },
  });
}
