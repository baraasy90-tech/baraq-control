import type { Database } from "@/lib/supabase/database.types";
import type { HrRequest } from "@/types/domain";

type Row = Database["public"]["Tables"]["hr_requests"]["Row"];

export function mapHrRequest(row: Row): HrRequest {
  return {
    id: row.id,
    companyId: row.company_id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    createdAt: row.created_at,
  };
}
