import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Decision } from "@/types/domain";
import { saveSubmission } from "./saveSubmission";

export interface UpdateSubmissionInput {
  id: string;
  activityId: string;
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
    mutationFn: async (input: UpdateSubmissionInput) =>
      saveSubmission(input.id, input.activityId, false, input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["activities", input.projectId] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["company_schedule_tasks"] });
    },
  });
}
