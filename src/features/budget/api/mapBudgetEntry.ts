import type { Database } from "@/lib/supabase/database.types";
import type { BudgetActualEntry } from "@/types/domain";

type BudgetEntryRow = Database["public"]["Tables"]["budget_actual_entries"]["Row"];

export function mapBudgetEntry(row: BudgetEntryRow): BudgetActualEntry {
  return {
    id: row.id,
    activityId: row.activity_id,
    date: row.date,
    amount: row.amount,
    source: row.source,
    note: row.note,
    contractRef: row.contract_ref,
    contractPaymentId: row.contract_payment_id,
    status: row.status,
    submittedAt: row.submitted_at,
    pmReviewedAt: row.pm_reviewed_at,
    pmReviewNote: row.pm_review_note,
    financeReviewedAt: row.finance_reviewed_at,
    financeReviewNote: row.finance_review_note,
  };
}
