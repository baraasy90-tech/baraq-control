import type { Database } from "@/lib/supabase/database.types";
import type { ContractExtraWork } from "@/types/domain";

type Row = Database["public"]["Tables"]["contract_extra_works"]["Row"];

export function mapExtraWork(row: Row): ContractExtraWork {
  return {
    id: row.id,
    contractId: row.contract_id,
    title: row.title,
    description: row.description,
    amount: row.amount,
    createdBy: row.created_by,
    createdAt: row.created_at,
    status: row.status,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at,
    pmReviewedBy: row.pm_reviewed_by,
    pmReviewedAt: row.pm_reviewed_at,
    pmReviewNote: row.pm_review_note,
    financeReviewedBy: row.finance_reviewed_by,
    financeReviewedAt: row.finance_reviewed_at,
    financeReviewNote: row.finance_review_note,
  };
}
