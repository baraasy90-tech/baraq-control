// Schema columns and relationships are generated. This adapter narrows CHECK-constrained text values.
import type { Database as Generated } from './database.generated';
export type { Json } from './database.generated';
type CheckedFields = {
  companies: {
    archive_storage_type: "cloud" | "local" | "drive";
    print_mode: "none" | "header_footer" | "full_page";
    subscription_status: "trial" | "active" | "expired" | "canceled";
  };
  projects: {
    status: "preparing" | "active" | "completed";
  };
  project_members: {
    role: "manager" | "member";
  };
  departments: {
    type: "project_management" | "finance" | "hr" | "executive" | "procurement" | "custom";
  };
  department_members: {
    role: "member" | "head";
  };
  employees: {
    status: "active" | "invited" | "pending" | "inactive";
  };
  invites: {
    role: "member" | "head";
    status: "pending" | "accepted" | "revoked";
  };
  activities: {
    calendar_type: "calendar" | "workdays";
    dep_type: "SS" | "FS" | null;
    lag_unit: "day" | "month";
    scope_type: "project" | "zone" | "unit" | "facility";
    budget_type: "lumpsum" | "boq" | "estimated" | null;
  };
  submissions: {
    decision: "approved" | "approvedWithNotes" | "rejected";
  };
  budget_actual_entries: {
    status: "draft" | "pending_pm_approval" | "pending_finance_approval" | "approved" | "rejected";
  };
  tasks: {
    status: "todo" | "in_progress" | "done";
    priority: "low" | "medium" | "high";
  };
  contracts: {
    status: "draft" | "pending_pm_approval" | "pending_finance_approval" | "approved" | "rejected";
    settlement_status: "open" | "pending_pm_approval" | "pending_finance_approval" | "settled" | "rejected";
  };
  contract_payments: {
    status: "pending" | "pending_pm_approval" | "pending_finance_approval" | "approved" | "rejected";
  };
  audit_log: {
    action: "insert" | "update" | "delete";
  };
  internal_requests: {
    type: "leave" | "contract_renewal" | "other" | null;
    status: "pending" | "approved" | "rejected";
  };
  approval_chain_templates: {
    chain_type: "linear" | "network";
  };
  internal_approval_chains: {
    chain_type: "linear" | "network";
    status: "pending" | "approved" | "rejected";
  };
  internal_approval_chain_steps: {
    status: "pending" | "approved" | "rejected" | "skipped";
  };
  contract_extra_works: {
    status: "draft" | "pending_pm_approval" | "pending_finance_approval" | "approved" | "rejected";
  };
  material_requests: {
    status: | "draft"
            | "sample_pending"
            | "sample_approved"
            | "sample_rejected"
            | "purchase_pending"
            | "purchase_approved"
            | "purchase_rejected";
  };
  material_request_attachments: {
    phase: "sample" | "purchase";
  };
  approval_chains: {
    phase: "sample" | "purchase";
    chain_type: "linear" | "network";
    status: "pending" | "approved" | "rejected";
  };
  approval_chain_steps: {
    status: "pending" | "approved" | "rejected" | "skipped";
  };
  budget_reconciliation_notes: {
    status: "pending" | "approved" | "rejected";
    kind: "value_vs_planned" | "paid_vs_actual";
  };
};
type Replace<T, F> = { [K in keyof T]: K extends keyof F ? F[K] : T[K] };
type NullableSqlArgument = "p_trial_ends_at" | "p_note" | "p_logo_url" | "p_archive_local_path" | "p_department_id" | "p_user_id" | "p_procurement_department_id" | "p_manager_signature_url" | "p_notes" | "p_type" | "p_description" | "p_start_date" | "p_end_date" | "p_template_id";
type Args<T> = { [K in keyof T]: K extends NullableSqlArgument ? T[K] | null : T[K] };
type DocumentMetadataRow = {category: import('@/features/documents/documentMetadata').DocumentCategory|null;reference_number:string|null;document_date:string|null;description:string|null;row_version:number};
type TrashColumns={trashed_at:string|null;trash_batch_id:string|null};
type TrashRow={id:string;project_id:string;root_kind:'folder'|'document';root_id:string;name:string;original_parent_id:string|null;deleted_at:string;deleted_by:string;folder_count:number;document_count:number;restored_at:string|null;restored_by:string|null};
type GeneratedFunctions = Generated['public']['Functions'];
type FunctionReturns<F extends keyof GeneratedFunctions> = F extends 'list_all_companies_billing' ? Replace<GeneratedFunctions[F]['Returns'][number], {subscription_status: CheckedFields['companies']['subscription_status']}>[] : GeneratedFunctions[F]['Returns'];
export type Database = Omit<Generated,'public'> & {public: Omit<Generated['public'],'Tables'|'Functions'> & {
 Tables: {[T in keyof Generated['public']['Tables']]: {[P in keyof Generated['public']['Tables'][T]]: P extends 'Row'|'Insert'|'Update' ? Replace<Generated['public']['Tables'][T][P], T extends keyof CheckedFields ? CheckedFields[T] : {}> & (T extends 'documents' ? P extends 'Row' ? DocumentMetadataRow : Partial<DocumentMetadataRow> : {}) & (T extends 'documents'|'document_folders' ? P extends 'Row' ? TrashColumns : Partial<TrashColumns> : {}) : Generated['public']['Tables'][T][P]}} & {document_trash:{Row:TrashRow;Insert:never;Update:never;Relationships:[]}};
 Functions: {[F in keyof GeneratedFunctions]: Omit<GeneratedFunctions[F],'Args'|'Returns'> & {Args: Args<GeneratedFunctions[F]['Args']>;Returns:FunctionReturns<F>}} & {
   set_document_content:{Args:{p_document_id:string;p_expected_version:number;p_text:string|null;p_sha256:string|null;p_extractor:string|null};Returns:undefined};
   search_document_content:{Args:{p_project_id:string;p_query:string;p_after?:string|null};Returns:{document_id:string;folder_id:string;name:string;file_url:string;snippet:string;row_version:number}[]};
   trash_project_archive:{Args:{p_project_id:string;p_kind:'folder'|'document';p_root_id:string;p_request_id:string;p_expected_version?:number|null;p_expected_name?:string|null};Returns:string};
   restore_project_archive:{Args:{p_project_id:string;p_batch_id:string};Returns:string};
   get_company_entitlements:{Args:{p_company_id:string};Returns:import('./database.generated').Json};
   set_company_entitlements:{Args:{p_company_id:string;p_package_name:string|null;p_max_file_mib:number|null;p_storage_gib:number|null;p_annual_transfer_gib:number|null;p_max_users:number|null;p_expected_revision:number};Returns:import('./database.generated').Json};
   has_platform_admin_access: { Args: Record<string, never>; Returns: boolean };
     ensure_document_folder: {Args:{p_project_id:string;p_parent_folder_id:string|null;p_name:string;p_id:string};Returns:string};
   get_project_subscription_policy: { Args: {p_project_id: string}; Returns: import("./database.generated").Json };
   get_company_subscription_policy: { Args: {p_company_id?: string}; Returns: import("./database.generated").Json };
   set_company_subscription_policy: { Args: {p_company_id: string;p_enabled: boolean}; Returns: undefined };
   list_platform_company_users: {Args:{p_company_id:string;p_offset?:number;p_search?:string};Returns:import("./database.generated").Json};
   list_subscription_audit: { Args: {p_company_id: string}; Returns: {id:number;changed_at:string;previous_status:string;next_status:string;previous_ends_at:string;next_ends_at:string;note:string|null}[] };
 };
}};
