import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Decision } from "@/types/domain";
import { saveSubmission } from "./saveSubmission";

export interface CreateSubmissionInput {
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

export function useCreateSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSubmissionInput) =>
      saveSubmission(input.id, input.activityId, true, input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["activities", input.projectId] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["company_schedule_tasks"] });
    },
  });
}
