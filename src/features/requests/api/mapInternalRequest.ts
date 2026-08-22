import type { Database } from "@/lib/supabase/database.types";
import type {
  ApprovalChainTemplate,
  ApprovalChainTemplateStep,
  InternalApprovalChain,
  InternalApprovalChainStep,
  InternalRequest,
  InternalRequestAttachment,
  InternalRequestAttachmentRevision,
} from "@/types/domain";

type RequestRow = Database["public"]["Tables"]["internal_requests"]["Row"];
type ChainRow = Database["public"]["Tables"]["internal_approval_chains"]["Row"];
type StepRow = Database["public"]["Tables"]["internal_approval_chain_steps"]["Row"];
type TemplateRow = Database["public"]["Tables"]["approval_chain_templates"]["Row"];
type TemplateStepRow = Database["public"]["Tables"]["approval_chain_template_steps"]["Row"];
type AttachmentRow = Database["public"]["Tables"]["internal_request_attachments"]["Row"];
type RevisionRow = Database["public"]["Tables"]["internal_request_attachment_revisions"]["Row"];

export function mapInternalRequest(row: RequestRow): InternalRequest {
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
    createdAt: row.created_at,
  };
}

export function mapInternalApprovalChain(row: ChainRow): InternalApprovalChain {
  return {
    id: row.id,
    internalRequestId: row.internal_request_id,
    chainType: row.chain_type,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    requesterNote: row.requester_note,
  };
}

export function mapInternalApprovalChainStep(row: StepRow): InternalApprovalChainStep {
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

export function mapApprovalChainTemplate(row: TemplateRow): ApprovalChainTemplate {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    chainType: row.chain_type,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function mapApprovalChainTemplateStep(row: TemplateStepRow): ApprovalChainTemplateStep {
  return {
    id: row.id,
    templateId: row.template_id,
    stepOrder: row.step_order,
    departmentId: row.department_id,
    assignedUserId: row.assigned_user_id,
  };
}

export function mapInternalRequestAttachment(row: AttachmentRow): InternalRequestAttachment {
  return {
    id: row.id,
    requestId: row.request_id,
    fileName: row.file_name,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function mapInternalRequestAttachmentRevision(row: RevisionRow): InternalRequestAttachmentRevision {
  return {
    id: row.id,
    attachmentId: row.attachment_id,
    revisionNumber: row.revision_number,
    fileUrl: row.file_url,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
    note: row.note,
  };
}
