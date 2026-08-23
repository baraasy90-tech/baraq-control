import type { Database } from "@/lib/supabase/database.types";
import type { ApprovalChain, ApprovalChainStep, MaterialRequest } from "@/types/domain";

type MaterialRequestRow = Database["public"]["Tables"]["material_requests"]["Row"];
type ApprovalChainRow = Database["public"]["Tables"]["approval_chains"]["Row"];
type ApprovalChainStepRow = Database["public"]["Tables"]["approval_chain_steps"]["Row"];

export function mapMaterialRequest(row: MaterialRequestRow): MaterialRequest {
  return {
    id: row.id,
    projectId: row.project_id,
    itemName: row.item_name,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
    status: row.status,
    quantity: row.quantity,
    targetUnitPrice: row.target_unit_price,
    neededBy: row.needed_by,
    attachmentsNote: row.attachments_note,
    quotePrice: row.quote_price,
    quoteReceivedAt: row.quote_received_at,
  };
}

export function mapApprovalChain(row: ApprovalChainRow): ApprovalChain {
  return {
    id: row.id,
    materialRequestId: row.material_request_id,
    phase: row.phase,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    requesterNote: row.requester_note,
  };
}

export function mapApprovalChainStep(row: ApprovalChainStepRow): ApprovalChainStep {
  return {
    id: row.id,
    chainId: row.chain_id,
    stepOrder: row.step_order,
    departmentId: row.department_id,
    assignedUserId: row.assigned_user_id,
    status: row.status,
    routedBy: row.routed_by,
    routedAt: row.routed_at,
    actedBy: row.acted_by,
    actedAt: row.acted_at,
    note: row.note,
    insertedBy: row.inserted_by,
    createdAt: row.created_at,
  };
}
