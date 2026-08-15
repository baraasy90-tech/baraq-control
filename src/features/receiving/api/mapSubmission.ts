import type { Database } from "@/lib/supabase/database.types";
import type { ChecklistResult, Submission } from "@/types/domain";

type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];
type ChecklistResultRow = Database["public"]["Tables"]["checklist_results"]["Row"];
type SubmissionImageRow = Database["public"]["Tables"]["submission_images"]["Row"];

export function mapChecklistResult(row: ChecklistResultRow): ChecklistResult {
  return {
    id: row.id,
    submissionId: row.submission_id,
    checklistItemId: row.checklist_item_id,
    checked: row.checked,
    imageUrl: row.image_url,
  };
}

export function mapSubmission(
  row: SubmissionRow,
  checklistResults: ChecklistResult[] = [],
  images: SubmissionImageRow[] = []
): Submission {
  return {
    id: row.id,
    activityId: row.activity_id,
    managerName: row.manager_name,
    managerSignatureUrl: row.manager_signature_url,
    decision: row.decision,
    notes: row.notes,
    createdAt: row.created_at,
    checklistResults,
    images: images.map((i) => i.image_url),
  };
}
