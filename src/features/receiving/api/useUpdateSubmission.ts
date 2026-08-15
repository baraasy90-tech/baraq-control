import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Decision } from "@/types/domain";

export interface UpdateSubmissionInput {
  id: string;
  projectId: string;
  managerName: string;
  managerSignatureUrl: string | null;
  decision: Decision;
  notes: string | null;
  checklistResults: { checklistItemId: string; checked: boolean; imageUrl: string | null }[];
  images: string[];
}

export function useUpdateSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSubmissionInput) => {
      const { error } = await supabase
        .from("submissions")
        .update({
          manager_name: input.managerName,
          manager_signature_url: input.managerSignatureUrl,
          decision: input.decision,
          notes: input.notes,
        })
        .eq("id", input.id);
      if (error) throw error;

      const { error: deleteResultsError } = await supabase
        .from("checklist_results")
        .delete()
        .eq("submission_id", input.id);
      if (deleteResultsError) throw deleteResultsError;
      if (input.checklistResults.length > 0) {
        const { error: insertResultsError } = await supabase.from("checklist_results").insert(
          input.checklistResults.map((r) => ({
            submission_id: input.id,
            checklist_item_id: r.checklistItemId,
            checked: r.checked,
            image_url: r.imageUrl,
          }))
        );
        if (insertResultsError) throw insertResultsError;
      }

      const { error: deleteImagesError } = await supabase
        .from("submission_images")
        .delete()
        .eq("submission_id", input.id);
      if (deleteImagesError) throw deleteImagesError;
      if (input.images.length > 0) {
        const { error: insertImagesError } = await supabase
          .from("submission_images")
          .insert(input.images.map((url) => ({ submission_id: input.id, image_url: url })));
        if (insertImagesError) throw insertImagesError;
      }
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["activities", input.projectId] });
    },
  });
}
