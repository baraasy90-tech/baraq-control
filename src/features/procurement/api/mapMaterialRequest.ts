import type { Database } from "@/lib/supabase/database.types";
import type { MaterialRequest } from "@/types/domain";

type MaterialRequestRow = Database["public"]["Tables"]["material_requests"]["Row"];

export function mapMaterialRequest(row: MaterialRequestRow): MaterialRequest {
  return {
    id: row.id,
    projectId: row.project_id,
    itemName: row.item_name,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
    status: row.status,
    samplePrice: row.sample_price,
    sampleReceivedAt: row.sample_received_at,
    sampleSubmittedBy: row.sample_submitted_by,
    sampleSubmittedAt: row.sample_submitted_at,
    samplePmReviewedBy: row.sample_pm_reviewed_by,
    samplePmReviewedAt: row.sample_pm_reviewed_at,
    samplePmReviewNote: row.sample_pm_review_note,
    sampleExecutiveReviewedBy: row.sample_executive_reviewed_by,
    sampleExecutiveReviewedAt: row.sample_executive_reviewed_at,
    sampleExecutiveReviewNote: row.sample_executive_review_note,
    attachmentsNote: row.attachments_note,
    quotePrice: row.quote_price,
    quoteReceivedAt: row.quote_received_at,
    purchaseSubmittedBy: row.purchase_submitted_by,
    purchaseSubmittedAt: row.purchase_submitted_at,
    purchasePmReviewedBy: row.purchase_pm_reviewed_by,
    purchasePmReviewedAt: row.purchase_pm_reviewed_at,
    purchasePmReviewNote: row.purchase_pm_review_note,
    purchaseFinanceReviewedBy: row.purchase_finance_reviewed_by,
    purchaseFinanceReviewedAt: row.purchase_finance_reviewed_at,
    purchaseFinanceReviewNote: row.purchase_finance_review_note,
  };
}
