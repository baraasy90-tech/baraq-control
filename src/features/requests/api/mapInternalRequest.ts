import type { Database } from "@/lib/supabase/database.types";
import type { InternalRequest } from "@/types/domain";

type Row = Database["public"]["Tables"]["internal_requests"]["Row"];

export function mapInternalRequest(row: Row): InternalRequest {
  return {
    id: row.id,
    companyId: row.company_id,
    userId: row.user_id,
    departmentId: row.department_id,
    targetUserId: row.target_user_id,
    type: row.type,
    title: row.title,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    attachmentUrl: row.attachment_url,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    createdAt: row.created_at,
  };
}
