import { supabase } from "@/lib/supabase/client";
import type { Decision } from "@/types/domain";

export interface SubmissionValues {
  managerName: string;
  managerSignatureUrl: string | null;
  decision: Decision;
  notes: string | null;
  checklistResults: { checklistItemId: string; checked: boolean; imageUrl: string | null }[];
  images: string[];
}

export async function saveSubmission(id: string, activityId: string, create: boolean, input: SubmissionValues) {
  const { data, error } = await supabase.rpc("save_receiving_submission", {
    p_submission_id: id, p_activity_id: activityId, p_create: create,
    p_manager_name: input.managerName, p_manager_signature_url: input.managerSignatureUrl,
    p_decision: input.decision, p_notes: input.notes,
    p_results: input.checklistResults.map(r => ({
      checklist_item_id: r.checklistItemId, checked: r.checked, image_url: r.imageUrl,
    })),
    p_images: input.images,
  });
  if (error) throw error;
  return data;
}
