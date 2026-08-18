import type { Database } from "@/lib/supabase/database.types";
import type { Contract, ContractDeduction, ContractLineItem, ContractPayment } from "@/types/domain";

type ContractRow = Database["public"]["Tables"]["contracts"]["Row"];
type LineItemRow = Database["public"]["Tables"]["contract_line_items"]["Row"];
type PaymentRow = Database["public"]["Tables"]["contract_payments"]["Row"];
type DeductionRow = Database["public"]["Tables"]["contract_deductions"]["Row"];

export function mapContract(row: ContractRow): Contract {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.contract_name,
    pdfUrl: row.pdf_url,
    startDate: row.start_date,
    durationDays: row.duration_days,
    totalValue: row.total_value,
    paymentTerms: row.payment_terms,
    hasAdvancePayment: row.has_advance_payment,
    advancePaymentPercentage: row.advance_payment_percentage,
    advancePaymentGuaranteeNote: row.advance_payment_guarantee_note,
    advanceDeductionPercentage: row.advance_deduction_percentage,
    retentionPercentage: row.retention_percentage,
    retentionReleased: row.retention_released,
    retentionReleaseNote: row.retention_release_note,
    createdAt: row.created_at,
    status: row.status,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
  };
}

export function mapLineItem(row: LineItemRow): ContractLineItem {
  return {
    id: row.id,
    contractId: row.contract_id,
    description: row.description,
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: row.unit_price,
    order: row.order,
  };
}

export function mapPayment(row: PaymentRow): ContractPayment {
  return {
    id: row.id,
    contractId: row.contract_id,
    title: row.title,
    dueDate: row.due_date,
    amount: row.amount,
    percentage: row.percentage,
    paid: row.paid,
    guaranteeNote: row.guarantee_note,
    order: row.order,
    isAdvancePayment: row.is_advance_payment,
  };
}

export function mapDeduction(row: DeductionRow): ContractDeduction {
  return {
    id: row.id,
    contractId: row.contract_id,
    violationName: row.violation_name,
    deductionAmount: row.deduction_amount,
    damageDescription: row.damage_description,
    deductedAt: row.deducted_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}
