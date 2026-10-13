
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "activities": {
                  Row: {
                    "actual_end_date": string | null,"actual_start_date": string | null,"alert_lead_days": number,"assigned_to": string | null,"boq_qty": number | null,"boq_unit": string | null,"boq_unit_price": number | null,"budget_type": string | null,"calendar_type": string,"code": string | null,"created_at": string,"critical": boolean,"custom_calendar_id": string | null,"dep_type": string | null,"depends_on": string | null,"done": boolean,"duration_days": number,"id": string,"lag_days": number,"lag_unit": string,"linked_contract_id": string | null,"name": string,"order": number,"parent_id": string | null,"planned_amount": number | null,"project_id": string,"requires_receiving": boolean,"scope_ref": string | null,"scope_type": string,"start_date": string | null,"template_group_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actual_end_date"?: string | null,"actual_start_date"?: string | null,"alert_lead_days"?: number,"assigned_to"?: string | null,"boq_qty"?: number | null,"boq_unit"?: string | null,"boq_unit_price"?: number | null,"budget_type"?: string | null,"calendar_type"?: string,"code"?: string | null,"created_at"?: string,"critical"?: boolean,"custom_calendar_id"?: string | null,"dep_type"?: string | null,"depends_on"?: string | null,"done"?: boolean,"duration_days"?: number,"id"?: string,"lag_days"?: number,"lag_unit"?: string,"linked_contract_id"?: string | null,"name": string,"order"?: number,"parent_id"?: string | null,"planned_amount"?: number | null,"project_id": string,"requires_receiving"?: boolean,"scope_ref"?: string | null,"scope_type"?: string,"start_date"?: string | null,"template_group_id"?: string | null
                  }
                  Update: {
                    "actual_end_date"?: string | null,"actual_start_date"?: string | null,"alert_lead_days"?: number,"assigned_to"?: string | null,"boq_qty"?: number | null,"boq_unit"?: string | null,"boq_unit_price"?: number | null,"budget_type"?: string | null,"calendar_type"?: string,"code"?: string | null,"created_at"?: string,"critical"?: boolean,"custom_calendar_id"?: string | null,"dep_type"?: string | null,"depends_on"?: string | null,"done"?: boolean,"duration_days"?: number,"id"?: string,"lag_days"?: number,"lag_unit"?: string,"linked_contract_id"?: string | null,"name"?: string,"order"?: number,"parent_id"?: string | null,"planned_amount"?: number | null,"project_id"?: string,"requires_receiving"?: boolean,"scope_ref"?: string | null,"scope_type"?: string,"start_date"?: string | null,"template_group_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "activities_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activities_custom_calendar_id_fkey"
      columns: ["custom_calendar_id"]
isOneToOne: false
      referencedRelation: "custom_calendars"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activities_depends_on_fkey"
      columns: ["depends_on"]
isOneToOne: false
      referencedRelation: "activities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activities_linked_contract_id_fkey"
      columns: ["linked_contract_id"]
isOneToOne: false
      referencedRelation: "contracts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activities_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "activities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activities_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"approval_chain_steps": {
                  Row: {
                    "acted_at": string | null,"acted_by": string | null,"assigned_user_id": string | null,"chain_id": string,"created_at": string,"department_id": string | null,"id": string,"inserted_by": string | null,"note": string | null,"routed_at": string | null,"routed_by": string | null,"status": string,"step_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "acted_at"?: string | null,"acted_by"?: string | null,"assigned_user_id"?: string | null,"chain_id": string,"created_at"?: string,"department_id"?: string | null,"id"?: string,"inserted_by"?: string | null,"note"?: string | null,"routed_at"?: string | null,"routed_by"?: string | null,"status"?: string,"step_order": number
                  }
                  Update: {
                    "acted_at"?: string | null,"acted_by"?: string | null,"assigned_user_id"?: string | null,"chain_id"?: string,"created_at"?: string,"department_id"?: string | null,"id"?: string,"inserted_by"?: string | null,"note"?: string | null,"routed_at"?: string | null,"routed_by"?: string | null,"status"?: string,"step_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "approval_chain_steps_acted_by_fkey"
      columns: ["acted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approval_chain_steps_assigned_user_id_fkey"
      columns: ["assigned_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approval_chain_steps_chain_id_fkey"
      columns: ["chain_id"]
isOneToOne: false
      referencedRelation: "approval_chains"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approval_chain_steps_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approval_chain_steps_inserted_by_fkey"
      columns: ["inserted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approval_chain_steps_routed_by_fkey"
      columns: ["routed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"approval_chain_template_steps": {
                  Row: {
                    "assigned_user_id": string | null,"department_id": string | null,"id": string,"step_order": number,"template_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_user_id"?: string | null,"department_id"?: string | null,"id"?: string,"step_order": number,"template_id": string
                  }
                  Update: {
                    "assigned_user_id"?: string | null,"department_id"?: string | null,"id"?: string,"step_order"?: number,"template_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "approval_chain_template_steps_assigned_user_id_fkey"
      columns: ["assigned_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approval_chain_template_steps_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approval_chain_template_steps_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "approval_chain_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"approval_chain_templates": {
                  Row: {
                    "chain_type": string,"company_id": string,"created_at": string,"created_by": string | null,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chain_type"?: string,"company_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string
                  }
                  Update: {
                    "chain_type"?: string,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "approval_chain_templates_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approval_chain_templates_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"approval_chains": {
                  Row: {
                    "chain_type": string,"created_at": string,"created_by": string | null,"decided_at": string | null,"id": string,"material_request_id": string,"phase": string,"requester_note": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chain_type"?: string,"created_at"?: string,"created_by"?: string | null,"decided_at"?: string | null,"id"?: string,"material_request_id": string,"phase": string,"requester_note"?: string | null,"status"?: string
                  }
                  Update: {
                    "chain_type"?: string,"created_at"?: string,"created_by"?: string | null,"decided_at"?: string | null,"id"?: string,"material_request_id"?: string,"phase"?: string,"requester_note"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "approval_chains_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approval_chains_material_request_id_fkey"
      columns: ["material_request_id"]
isOneToOne: false
      referencedRelation: "material_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"company_id": string,"created_at": string,"id": string,"new_data": Json | null,"old_data": Json | null,"project_id": string | null,"record_id": string,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"company_id": string,"created_at"?: string,"id"?: string,"new_data"?: Json | null,"old_data"?: Json | null,"project_id"?: string | null,"record_id": string,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"company_id"?: string,"created_at"?: string,"id"?: string,"new_data"?: Json | null,"old_data"?: Json | null,"project_id"?: string | null,"record_id"?: string,"table_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_log_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_log_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"budget_actual_entries": {
                  Row: {
                    "activity_id": string,"amount": number,"contract_payment_id": string | null,"contract_ref": string | null,"date": string,"finance_review_note": string | null,"finance_reviewed_at": string | null,"finance_reviewed_by": string | null,"id": string,"note": string | null,"pm_review_note": string | null,"pm_reviewed_at": string | null,"pm_reviewed_by": string | null,"source": string,"status": string,"submitted_at": string | null,"submitted_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_id": string,"amount"?: number,"contract_payment_id"?: string | null,"contract_ref"?: string | null,"date": string,"finance_review_note"?: string | null,"finance_reviewed_at"?: string | null,"finance_reviewed_by"?: string | null,"id"?: string,"note"?: string | null,"pm_review_note"?: string | null,"pm_reviewed_at"?: string | null,"pm_reviewed_by"?: string | null,"source"?: string,"status"?: string,"submitted_at"?: string | null,"submitted_by"?: string | null
                  }
                  Update: {
                    "activity_id"?: string,"amount"?: number,"contract_payment_id"?: string | null,"contract_ref"?: string | null,"date"?: string,"finance_review_note"?: string | null,"finance_reviewed_at"?: string | null,"finance_reviewed_by"?: string | null,"id"?: string,"note"?: string | null,"pm_review_note"?: string | null,"pm_reviewed_at"?: string | null,"pm_reviewed_by"?: string | null,"source"?: string,"status"?: string,"submitted_at"?: string | null,"submitted_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "budget_actual_entries_activity_id_fkey"
      columns: ["activity_id"]
isOneToOne: false
      referencedRelation: "activities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budget_actual_entries_contract_payment_id_fkey"
      columns: ["contract_payment_id"]
isOneToOne: false
      referencedRelation: "contract_payments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budget_actual_entries_finance_reviewed_by_fkey"
      columns: ["finance_reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budget_actual_entries_pm_reviewed_by_fkey"
      columns: ["pm_reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budget_actual_entries_submitted_by_fkey"
      columns: ["submitted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"budget_reconciliation_notes": {
                  Row: {
                    "contract_value": number | null,"created_at": string,"created_by": string,"id": string,"kind": string,"note": string,"project_id": string,"review_note": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": string,"tracked_budget_value": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "contract_value"?: number | null,"created_at"?: string,"created_by": string,"id"?: string,"kind"?: string,"note": string,"project_id": string,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"tracked_budget_value"?: number | null
                  }
                  Update: {
                    "contract_value"?: number | null,"created_at"?: string,"created_by"?: string,"id"?: string,"kind"?: string,"note"?: string,"project_id"?: string,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"tracked_budget_value"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "budget_reconciliation_notes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budget_reconciliation_notes_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budget_reconciliation_notes_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"checklist_items": {
                  Row: {
                    "activity_id": string,"id": string,"order": number,"photo_required": boolean,"text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_id": string,"id"?: string,"order"?: number,"photo_required"?: boolean,"text": string
                  }
                  Update: {
                    "activity_id"?: string,"id"?: string,"order"?: number,"photo_required"?: boolean,"text"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checklist_items_activity_id_fkey"
      columns: ["activity_id"]
isOneToOne: false
      referencedRelation: "activities"
      referencedColumns: ["id"]
    }
                  ]
                },"checklist_results": {
                  Row: {
                    "checked": boolean,"checklist_item_id": string | null,"id": string,"image_url": string | null,"submission_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "checked"?: boolean,"checklist_item_id"?: string | null,"id"?: string,"image_url"?: string | null,"submission_id": string
                  }
                  Update: {
                    "checked"?: boolean,"checklist_item_id"?: string | null,"id"?: string,"image_url"?: string | null,"submission_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checklist_results_checklist_item_id_fkey"
      columns: ["checklist_item_id"]
isOneToOne: false
      referencedRelation: "checklist_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklist_results_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    }
                  ]
                },"companies": {
                  Row: {
                    "archive_folder_name": string,"archive_local_path": string | null,"archive_storage_type": string,"company_code": string,"company_code_expires_at": string | null,"country_code": string,"created_at": string,"created_by": string | null,"header_color": string,"id": string,"is_individual": boolean,"logo_url": string | null,"name": string,"print_footer_url": string | null,"print_full_page_url": string | null,"print_header_url": string | null,"print_margin_bottom": number,"print_margin_left": number,"print_margin_right": number,"print_margin_top": number,"print_mode": string,"subscription_note": string | null,"subscription_status": string,"subscription_updated_at": string | null,"subscription_updated_by": string | null,"trial_ends_at": string,"vat_rate": number
                  }
                  ComputedFields: never
                  Insert: {
                    "archive_folder_name"?: string,"archive_local_path"?: string | null,"archive_storage_type"?: string,"company_code"?: string,"company_code_expires_at"?: string | null,"country_code"?: string,"created_at"?: string,"created_by"?: string | null,"header_color"?: string,"id"?: string,"is_individual"?: boolean,"logo_url"?: string | null,"name": string,"print_footer_url"?: string | null,"print_full_page_url"?: string | null,"print_header_url"?: string | null,"print_margin_bottom"?: number,"print_margin_left"?: number,"print_margin_right"?: number,"print_margin_top"?: number,"print_mode"?: string,"subscription_note"?: string | null,"subscription_status"?: string,"subscription_updated_at"?: string | null,"subscription_updated_by"?: string | null,"trial_ends_at"?: string,"vat_rate"?: number
                  }
                  Update: {
                    "archive_folder_name"?: string,"archive_local_path"?: string | null,"archive_storage_type"?: string,"company_code"?: string,"company_code_expires_at"?: string | null,"country_code"?: string,"created_at"?: string,"created_by"?: string | null,"header_color"?: string,"id"?: string,"is_individual"?: boolean,"logo_url"?: string | null,"name"?: string,"print_footer_url"?: string | null,"print_full_page_url"?: string | null,"print_header_url"?: string | null,"print_margin_bottom"?: number,"print_margin_left"?: number,"print_margin_right"?: number,"print_margin_top"?: number,"print_mode"?: string,"subscription_note"?: string | null,"subscription_status"?: string,"subscription_updated_at"?: string | null,"subscription_updated_by"?: string | null,"trial_ends_at"?: string,"vat_rate"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "companies_subscription_updated_by_fkey"
      columns: ["subscription_updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"company_holidays": {
                  Row: {
                    "company_id": string,"created_at": string,"holiday_date": string,"id": string,"name": string,"recurring_yearly": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"holiday_date": string,"id"?: string,"name": string,"recurring_yearly"?: boolean
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"holiday_date"?: string,"id"?: string,"name"?: string,"recurring_yearly"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_holidays_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"contract_deductions": {
                  Row: {
                    "contract_id": string,"created_at": string,"created_by": string,"damage_description": string | null,"deducted_at": string,"deduction_amount": number,"id": string,"violation_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contract_id": string,"created_at"?: string,"created_by": string,"damage_description"?: string | null,"deducted_at"?: string,"deduction_amount": number,"id"?: string,"violation_name": string
                  }
                  Update: {
                    "contract_id"?: string,"created_at"?: string,"created_by"?: string,"damage_description"?: string | null,"deducted_at"?: string,"deduction_amount"?: number,"id"?: string,"violation_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contract_deductions_contract_id_fkey"
      columns: ["contract_id"]
isOneToOne: false
      referencedRelation: "contracts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contract_deductions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"contract_extra_works": {
                  Row: {
                    "amount": number,"contract_id": string,"created_at": string,"created_by": string | null,"description": string | null,"finance_review_note": string | null,"finance_reviewed_at": string | null,"finance_reviewed_by": string | null,"id": string,"pm_review_note": string | null,"pm_reviewed_at": string | null,"pm_reviewed_by": string | null,"status": string,"submitted_at": string | null,"submitted_by": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"contract_id": string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"finance_review_note"?: string | null,"finance_reviewed_at"?: string | null,"finance_reviewed_by"?: string | null,"id"?: string,"pm_review_note"?: string | null,"pm_reviewed_at"?: string | null,"pm_reviewed_by"?: string | null,"status"?: string,"submitted_at"?: string | null,"submitted_by"?: string | null,"title": string
                  }
                  Update: {
                    "amount"?: number,"contract_id"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"finance_review_note"?: string | null,"finance_reviewed_at"?: string | null,"finance_reviewed_by"?: string | null,"id"?: string,"pm_review_note"?: string | null,"pm_reviewed_at"?: string | null,"pm_reviewed_by"?: string | null,"status"?: string,"submitted_at"?: string | null,"submitted_by"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contract_extra_works_contract_id_fkey"
      columns: ["contract_id"]
isOneToOne: false
      referencedRelation: "contracts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contract_extra_works_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contract_extra_works_finance_reviewed_by_fkey"
      columns: ["finance_reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contract_extra_works_pm_reviewed_by_fkey"
      columns: ["pm_reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contract_extra_works_submitted_by_fkey"
      columns: ["submitted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"contract_line_items": {
                  Row: {
                    "contract_id": string,"description": string,"id": string,"order": number,"quantity": number | null,"unit": string | null,"unit_price": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "contract_id": string,"description": string,"id"?: string,"order"?: number,"quantity"?: number | null,"unit"?: string | null,"unit_price"?: number | null
                  }
                  Update: {
                    "contract_id"?: string,"description"?: string,"id"?: string,"order"?: number,"quantity"?: number | null,"unit"?: string | null,"unit_price"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contract_line_items_contract_id_fkey"
      columns: ["contract_id"]
isOneToOne: false
      referencedRelation: "contracts"
      referencedColumns: ["id"]
    }
                  ]
                },"contract_payments": {
                  Row: {
                    "amount": number | null,"contract_id": string,"due_date": string | null,"finance_review_note": string | null,"finance_reviewed_at": string | null,"finance_reviewed_by": string | null,"guarantee_note": string | null,"id": string,"is_advance_payment": boolean,"order": number,"paid": boolean,"percentage": number | null,"pm_review_note": string | null,"pm_reviewed_at": string | null,"pm_reviewed_by": string | null,"status": string,"submitted_at": string | null,"submitted_by": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number | null,"contract_id": string,"due_date"?: string | null,"finance_review_note"?: string | null,"finance_reviewed_at"?: string | null,"finance_reviewed_by"?: string | null,"guarantee_note"?: string | null,"id"?: string,"is_advance_payment"?: boolean,"order"?: number,"paid"?: boolean,"percentage"?: number | null,"pm_review_note"?: string | null,"pm_reviewed_at"?: string | null,"pm_reviewed_by"?: string | null,"status"?: string,"submitted_at"?: string | null,"submitted_by"?: string | null,"title": string
                  }
                  Update: {
                    "amount"?: number | null,"contract_id"?: string,"due_date"?: string | null,"finance_review_note"?: string | null,"finance_reviewed_at"?: string | null,"finance_reviewed_by"?: string | null,"guarantee_note"?: string | null,"id"?: string,"is_advance_payment"?: boolean,"order"?: number,"paid"?: boolean,"percentage"?: number | null,"pm_review_note"?: string | null,"pm_reviewed_at"?: string | null,"pm_reviewed_by"?: string | null,"status"?: string,"submitted_at"?: string | null,"submitted_by"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contract_payments_contract_id_fkey"
      columns: ["contract_id"]
isOneToOne: false
      referencedRelation: "contracts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contract_payments_finance_reviewed_by_fkey"
      columns: ["finance_reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contract_payments_pm_reviewed_by_fkey"
      columns: ["pm_reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contract_payments_submitted_by_fkey"
      columns: ["submitted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"contracts": {
                  Row: {
                    "advance_deduction_percentage": number | null,"advance_payment_guarantee_note": string | null,"advance_payment_percentage": number | null,"contract_name": string,"created_at": string,"duration_days": number | null,"finance_review_note": string | null,"finance_reviewed_at": string | null,"finance_reviewed_by": string | null,"has_advance_payment": boolean,"id": string,"payment_terms": string | null,"pdf_url": string | null,"pm_review_note": string | null,"pm_reviewed_at": string | null,"pm_reviewed_by": string | null,"project_id": string,"retention_percentage": number | null,"retention_release_note": string | null,"retention_released": boolean,"settled_at": string | null,"settlement_finance_review_note": string | null,"settlement_finance_reviewed_at": string | null,"settlement_finance_reviewed_by": string | null,"settlement_note": string | null,"settlement_pm_review_note": string | null,"settlement_pm_reviewed_at": string | null,"settlement_pm_reviewed_by": string | null,"settlement_status": string,"settlement_submitted_at": string | null,"settlement_submitted_by": string | null,"start_date": string | null,"status": string,"submitted_at": string | null,"submitted_by": string | null,"total_value": number | null,"vat_inclusive": boolean,"vat_rate": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "advance_deduction_percentage"?: number | null,"advance_payment_guarantee_note"?: string | null,"advance_payment_percentage"?: number | null,"contract_name"?: string,"created_at"?: string,"duration_days"?: number | null,"finance_review_note"?: string | null,"finance_reviewed_at"?: string | null,"finance_reviewed_by"?: string | null,"has_advance_payment"?: boolean,"id"?: string,"payment_terms"?: string | null,"pdf_url"?: string | null,"pm_review_note"?: string | null,"pm_reviewed_at"?: string | null,"pm_reviewed_by"?: string | null,"project_id": string,"retention_percentage"?: number | null,"retention_release_note"?: string | null,"retention_released"?: boolean,"settled_at"?: string | null,"settlement_finance_review_note"?: string | null,"settlement_finance_reviewed_at"?: string | null,"settlement_finance_reviewed_by"?: string | null,"settlement_note"?: string | null,"settlement_pm_review_note"?: string | null,"settlement_pm_reviewed_at"?: string | null,"settlement_pm_reviewed_by"?: string | null,"settlement_status"?: string,"settlement_submitted_at"?: string | null,"settlement_submitted_by"?: string | null,"start_date"?: string | null,"status"?: string,"submitted_at"?: string | null,"submitted_by"?: string | null,"total_value"?: number | null,"vat_inclusive"?: boolean,"vat_rate"?: number | null
                  }
                  Update: {
                    "advance_deduction_percentage"?: number | null,"advance_payment_guarantee_note"?: string | null,"advance_payment_percentage"?: number | null,"contract_name"?: string,"created_at"?: string,"duration_days"?: number | null,"finance_review_note"?: string | null,"finance_reviewed_at"?: string | null,"finance_reviewed_by"?: string | null,"has_advance_payment"?: boolean,"id"?: string,"payment_terms"?: string | null,"pdf_url"?: string | null,"pm_review_note"?: string | null,"pm_reviewed_at"?: string | null,"pm_reviewed_by"?: string | null,"project_id"?: string,"retention_percentage"?: number | null,"retention_release_note"?: string | null,"retention_released"?: boolean,"settled_at"?: string | null,"settlement_finance_review_note"?: string | null,"settlement_finance_reviewed_at"?: string | null,"settlement_finance_reviewed_by"?: string | null,"settlement_note"?: string | null,"settlement_pm_review_note"?: string | null,"settlement_pm_reviewed_at"?: string | null,"settlement_pm_reviewed_by"?: string | null,"settlement_status"?: string,"settlement_submitted_at"?: string | null,"settlement_submitted_by"?: string | null,"start_date"?: string | null,"status"?: string,"submitted_at"?: string | null,"submitted_by"?: string | null,"total_value"?: number | null,"vat_inclusive"?: boolean,"vat_rate"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contracts_finance_reviewed_by_fkey"
      columns: ["finance_reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contracts_pm_reviewed_by_fkey"
      columns: ["pm_reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contracts_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contracts_settlement_finance_reviewed_by_fkey"
      columns: ["settlement_finance_reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contracts_settlement_pm_reviewed_by_fkey"
      columns: ["settlement_pm_reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contracts_settlement_submitted_by_fkey"
      columns: ["settlement_submitted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contracts_submitted_by_fkey"
      columns: ["submitted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"custom_calendars": {
                  Row: {
                    "company_id": string,"created_at": string,"id": string,"name": string,"working_weekdays": (number)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"id"?: string,"name": string,"working_weekdays": (number)[]
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"id"?: string,"name"?: string,"working_weekdays"?: (number)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "custom_calendars_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"department_members": {
                  Row: {
                    "created_at": string,"department_id": string,"employee_id": string | null,"id": string,"job_title_id": string | null,"organizational_classification_id": string | null,"organizational_level_id": string | null,"role": string,"title": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"department_id": string,"employee_id"?: string | null,"id"?: string,"job_title_id"?: string | null,"organizational_classification_id"?: string | null,"organizational_level_id"?: string | null,"role"?: string,"title"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"department_id"?: string,"employee_id"?: string | null,"id"?: string,"job_title_id"?: string | null,"organizational_classification_id"?: string | null,"organizational_level_id"?: string | null,"role"?: string,"title"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "department_members_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "department_members_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "department_members_job_title_id_fkey"
      columns: ["job_title_id"]
isOneToOne: false
      referencedRelation: "job_titles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "department_members_organizational_classification_id_fkey"
      columns: ["organizational_classification_id"]
isOneToOne: false
      referencedRelation: "organizational_classifications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "department_members_organizational_level_id_fkey"
      columns: ["organizational_level_id"]
isOneToOne: false
      referencedRelation: "organizational_levels"
      referencedColumns: ["id"]
    }
                  ]
                },"departments": {
                  Row: {
                    "company_id": string,"created_at": string,"head_label": string | null,"id": string,"member_label": string | null,"name": string,"parent_department_id": string | null,"position_x": number | null,"position_y": number | null,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"head_label"?: string | null,"id"?: string,"member_label"?: string | null,"name": string,"parent_department_id"?: string | null,"position_x"?: number | null,"position_y"?: number | null,"type"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"head_label"?: string | null,"id"?: string,"member_label"?: string | null,"name"?: string,"parent_department_id"?: string | null,"position_x"?: number | null,"position_y"?: number | null,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "departments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "departments_parent_department_id_fkey"
      columns: ["parent_department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"document_folders": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"parent_folder_id": string | null,"project_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"parent_folder_id"?: string | null,"project_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"parent_folder_id"?: string | null,"project_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "document_folders_parent_folder_id_fkey"
      columns: ["parent_folder_id"]
isOneToOne: false
      referencedRelation: "document_folders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "document_folders_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "file_url": string,"folder_id": string,"id": string,"name": string,"uploaded_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "file_url": string,"folder_id": string,"id"?: string,"name": string,"uploaded_at"?: string
                  }
                  Update: {
                    "file_url"?: string,"folder_id"?: string,"id"?: string,"name"?: string,"uploaded_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_folder_id_fkey"
      columns: ["folder_id"]
isOneToOne: false
      referencedRelation: "document_folders"
      referencedColumns: ["id"]
    }
                  ]
                },"employees": {
                  Row: {
                    "company_id": string,"created_at": string,"department_id": string | null,"direct_manager_employee_id": string | null,"email": string | null,"full_name": string,"id": string,"job_title_id": string | null,"organizational_classification_id": string | null,"organizational_level_id": string | null,"phone": string | null,"status": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"department_id"?: string | null,"direct_manager_employee_id"?: string | null,"email"?: string | null,"full_name": string,"id"?: string,"job_title_id"?: string | null,"organizational_classification_id"?: string | null,"organizational_level_id"?: string | null,"phone"?: string | null,"status"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"department_id"?: string | null,"direct_manager_employee_id"?: string | null,"email"?: string | null,"full_name"?: string,"id"?: string,"job_title_id"?: string | null,"organizational_classification_id"?: string | null,"organizational_level_id"?: string | null,"phone"?: string | null,"status"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "employees_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employees_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employees_direct_manager_employee_id_fkey"
      columns: ["direct_manager_employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employees_job_title_id_fkey"
      columns: ["job_title_id"]
isOneToOne: false
      referencedRelation: "job_titles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employees_organizational_classification_id_fkey"
      columns: ["organizational_classification_id"]
isOneToOne: false
      referencedRelation: "organizational_classifications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employees_organizational_level_id_fkey"
      columns: ["organizational_level_id"]
isOneToOne: false
      referencedRelation: "organizational_levels"
      referencedColumns: ["id"]
    }
                  ]
                },"internal_approval_chain_steps": {
                  Row: {
                    "acted_at": string | null,"acted_by": string | null,"assigned_user_id": string | null,"chain_id": string,"created_at": string,"department_id": string | null,"id": string,"inserted_by": string | null,"note": string | null,"routed_at": string | null,"routed_by": string | null,"status": string,"step_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "acted_at"?: string | null,"acted_by"?: string | null,"assigned_user_id"?: string | null,"chain_id": string,"created_at"?: string,"department_id"?: string | null,"id"?: string,"inserted_by"?: string | null,"note"?: string | null,"routed_at"?: string | null,"routed_by"?: string | null,"status"?: string,"step_order": number
                  }
                  Update: {
                    "acted_at"?: string | null,"acted_by"?: string | null,"assigned_user_id"?: string | null,"chain_id"?: string,"created_at"?: string,"department_id"?: string | null,"id"?: string,"inserted_by"?: string | null,"note"?: string | null,"routed_at"?: string | null,"routed_by"?: string | null,"status"?: string,"step_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "internal_approval_chain_steps_acted_by_fkey"
      columns: ["acted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "internal_approval_chain_steps_assigned_user_id_fkey"
      columns: ["assigned_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "internal_approval_chain_steps_chain_id_fkey"
      columns: ["chain_id"]
isOneToOne: false
      referencedRelation: "internal_approval_chains"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "internal_approval_chain_steps_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "internal_approval_chain_steps_inserted_by_fkey"
      columns: ["inserted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "internal_approval_chain_steps_routed_by_fkey"
      columns: ["routed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"internal_approval_chains": {
                  Row: {
                    "chain_type": string,"created_at": string,"created_by": string | null,"decided_at": string | null,"id": string,"internal_request_id": string,"requester_note": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chain_type"?: string,"created_at"?: string,"created_by"?: string | null,"decided_at"?: string | null,"id"?: string,"internal_request_id": string,"requester_note"?: string | null,"status"?: string
                  }
                  Update: {
                    "chain_type"?: string,"created_at"?: string,"created_by"?: string | null,"decided_at"?: string | null,"id"?: string,"internal_request_id"?: string,"requester_note"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "internal_approval_chains_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "internal_approval_chains_internal_request_id_fkey"
      columns: ["internal_request_id"]
isOneToOne: false
      referencedRelation: "internal_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"internal_request_attachment_revisions": {
                  Row: {
                    "attachment_id": string,"file_url": string,"id": string,"note": string | null,"revision_number": number,"uploaded_at": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attachment_id": string,"file_url": string,"id"?: string,"note"?: string | null,"revision_number": number,"uploaded_at"?: string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "attachment_id"?: string,"file_url"?: string,"id"?: string,"note"?: string | null,"revision_number"?: number,"uploaded_at"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "internal_request_attachment_revisions_attachment_id_fkey"
      columns: ["attachment_id"]
isOneToOne: false
      referencedRelation: "internal_request_attachments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "internal_request_attachment_revisions_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"internal_request_attachments": {
                  Row: {
                    "created_at": string,"created_by": string | null,"file_name": string,"id": string,"request_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"file_name": string,"id"?: string,"request_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"file_name"?: string,"id"?: string,"request_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "internal_request_attachments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "internal_request_attachments_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "internal_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"internal_requests": {
                  Row: {
                    "company_id": string,"created_at": string,"description": string | null,"end_date": string | null,"id": string,"start_date": string | null,"status": string,"title": string,"type": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"description"?: string | null,"end_date"?: string | null,"id"?: string,"start_date"?: string | null,"status"?: string,"title": string,"type"?: string | null,"user_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"description"?: string | null,"end_date"?: string | null,"id"?: string,"start_date"?: string | null,"status"?: string,"title"?: string,"type"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "internal_requests_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "internal_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"invites": {
                  Row: {
                    "company_id": string,"created_at": string,"department_id": string,"email": string,"expires_at": string,"id": string,"invited_by": string,"role": string,"status": string,"token": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"department_id": string,"email": string,"expires_at"?: string,"id"?: string,"invited_by": string,"role"?: string,"status"?: string,"token"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"department_id"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string,"role"?: string,"status"?: string,"token"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invites_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invites_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"job_titles": {
                  Row: {
                    "company_id": string,"created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_titles_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"material_request_attachments": {
                  Row: {
                    "file_name": string,"file_url": string,"id": string,"material_request_id": string,"option_id": string | null,"phase": string,"uploaded_at": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "file_name": string,"file_url": string,"id"?: string,"material_request_id": string,"option_id"?: string | null,"phase"?: string,"uploaded_at"?: string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "file_name"?: string,"file_url"?: string,"id"?: string,"material_request_id"?: string,"option_id"?: string | null,"phase"?: string,"uploaded_at"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "material_request_attachments_material_request_id_fkey"
      columns: ["material_request_id"]
isOneToOne: false
      referencedRelation: "material_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "material_request_attachments_option_id_fkey"
      columns: ["option_id"]
isOneToOne: false
      referencedRelation: "material_request_options"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "material_request_attachments_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"material_request_options": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string,"id": string,"material_request_id": string,"price": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description": string,"id"?: string,"material_request_id": string,"price"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"material_request_id"?: string,"price"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "material_request_options_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "material_request_options_material_request_id_fkey"
      columns: ["material_request_id"]
isOneToOne: false
      referencedRelation: "material_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"material_requests": {
                  Row: {
                    "attachments_note": string | null,"created_at": string,"created_by": string | null,"description": string | null,"id": string,"item_name": string,"needed_by": string | null,"project_id": string,"quantity": number | null,"quote_price": number | null,"quote_received_at": string | null,"status": string,"target_unit_price": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attachments_note"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"item_name": string,"needed_by"?: string | null,"project_id": string,"quantity"?: number | null,"quote_price"?: number | null,"quote_received_at"?: string | null,"status"?: string,"target_unit_price"?: number | null
                  }
                  Update: {
                    "attachments_note"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"item_name"?: string,"needed_by"?: string | null,"project_id"?: string,"quantity"?: number | null,"quote_price"?: number | null,"quote_received_at"?: string | null,"status"?: string,"target_unit_price"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "material_requests_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "material_requests_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"company_id": string,"created_at": string,"id": string,"link": string | null,"read_at": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"company_id": string,"created_at"?: string,"id"?: string,"link"?: string | null,"read_at"?: string | null,"title": string,"user_id": string
                  }
                  Update: {
                    "body"?: string | null,"company_id"?: string,"created_at"?: string,"id"?: string,"link"?: string | null,"read_at"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"organizational_classifications": {
                  Row: {
                    "company_id": string,"created_at": string,"description": string | null,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"description"?: string | null,"id"?: string,"name": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "organizational_classifications_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"organizational_levels": {
                  Row: {
                    "company_id": string,"created_at": string,"id": string,"is_employee_level": boolean,"is_management_level": boolean,"is_worker_level": boolean,"name": string,"order_index": number
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"id"?: string,"is_employee_level"?: boolean,"is_management_level"?: boolean,"is_worker_level"?: boolean,"name": string,"order_index"?: number
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"id"?: string,"is_employee_level"?: boolean,"is_management_level"?: boolean,"is_worker_level"?: boolean,"name"?: string,"order_index"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "organizational_levels_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"platform_admins": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "platform_admins_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "company_id": string | null,"created_at": string,"full_name": string,"id": string,"signature_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id"?: string | null,"created_at"?: string,"full_name"?: string,"id": string,"signature_url"?: string | null
                  }
                  Update: {
                    "company_id"?: string | null,"created_at"?: string,"full_name"?: string,"id"?: string,"signature_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"project_members": {
                  Row: {
                    "created_at": string,"id": string,"project_id": string,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"project_id": string,"role"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"project_id"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_members_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "area": string,"company_id": string,"created_at": string,"department_id": string | null,"id": string,"location": string,"manager_name": string,"manager_signature_url": string | null,"map_link": string,"name": string,"procurement_department_id": string | null,"project_type": string,"scope_config": Json | null,"status": string,"theme_color": string,"theme_icon": string,"units_count": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area"?: string,"company_id": string,"created_at"?: string,"department_id"?: string | null,"id"?: string,"location"?: string,"manager_name"?: string,"manager_signature_url"?: string | null,"map_link"?: string,"name": string,"procurement_department_id"?: string | null,"project_type"?: string,"scope_config"?: Json | null,"status"?: string,"theme_color"?: string,"theme_icon"?: string,"units_count"?: string
                  }
                  Update: {
                    "area"?: string,"company_id"?: string,"created_at"?: string,"department_id"?: string | null,"id"?: string,"location"?: string,"manager_name"?: string,"manager_signature_url"?: string | null,"map_link"?: string,"name"?: string,"procurement_department_id"?: string | null,"project_type"?: string,"scope_config"?: Json | null,"status"?: string,"theme_color"?: string,"theme_icon"?: string,"units_count"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_department_same_company"
      columns: ["department_id","company_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id","company_id"]
    },{
      foreignKeyName: "projects_procurement_department_id_fkey"
      columns: ["procurement_department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_procurement_department_same_company"
      columns: ["procurement_department_id","company_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id","company_id"]
    }
                  ]
                },"submission_images": {
                  Row: {
                    "id": string,"image_url": string,"submission_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"image_url": string,"submission_id": string
                  }
                  Update: {
                    "id"?: string,"image_url"?: string,"submission_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "submission_images_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    }
                  ]
                },"submissions": {
                  Row: {
                    "activity_id": string,"created_at": string,"decision": string,"id": string,"manager_name": string,"manager_signature_url": string | null,"notes": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_id": string,"created_at"?: string,"decision": string,"id"?: string,"manager_name"?: string,"manager_signature_url"?: string | null,"notes"?: string | null
                  }
                  Update: {
                    "activity_id"?: string,"created_at"?: string,"decision"?: string,"id"?: string,"manager_name"?: string,"manager_signature_url"?: string | null,"notes"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "submissions_activity_id_fkey"
      columns: ["activity_id"]
isOneToOne: false
      referencedRelation: "activities"
      referencedColumns: ["id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "assigned_to": string | null,"completed_at": string | null,"created_at": string,"created_by": string,"description": string | null,"due_date": string | null,"id": string,"priority": string,"project_id": string,"status": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_to"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by": string,"description"?: string | null,"due_date"?: string | null,"id"?: string,"priority"?: string,"project_id": string,"status"?: string,"title": string
                  }
                  Update: {
                    "assigned_to"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string,"description"?: string | null,"due_date"?: string | null,"id"?: string,"priority"?: string,"project_id"?: string,"status"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_invite":
{ Args: { "p_token": string }; Returns: {
              "result_company_id": string,"result_company_name": string,"result_department_id": string,"result_role": string
            }[]
                           },
"add_internal_request_attachment":
{ Args: { "p_file_name": string,"p_file_url": string,"p_request_id": string }; Returns: string
                           },
"add_internal_request_attachment_revision":
{ Args: { "p_attachment_id": string,"p_file_url": string,"p_note": string }; Returns: string
                           },
"can_access_project":
{ Args: { "p_project_id": string }; Returns: boolean
                           },
"can_approve_budget_variance":
{ Args: { "p_project_id": string }; Returns: boolean
                           },
"can_executive_approve":
{ Args: { "p_project_id": string }; Returns: boolean
                           },
"can_finance_approve":
{ Args: { "p_project_id": string }; Returns: boolean
                           },
"can_manage_department":
{ Args: { "p_department_id": string }; Returns: boolean
                           },
"can_manage_org":
{ Args: { "p_company_id": string }; Returns: boolean
                           },
"can_manage_project":
{ Args: { "p_project_id": string }; Returns: boolean
                           },
"can_pm_approve":
{ Args: { "p_project_id": string }; Returns: boolean
                           },
"can_view_audit_entry":
{ Args: { "p_company_id": string,"p_project_id": string,"p_record_id": string,"p_table_name": string }; Returns: boolean
                           },
"can_view_internal_request":
{ Args: { "p_request_id": string }; Returns: boolean
                           },
"claim_storage_cleanup":
{ Args: { "p_limit"?: number }; Returns: {
              "bucket": string,"id": string,"path": string
            }[]
                           },
"consume_edge_request":
{ Args: { "p_actor_id": string,"p_operation": string }; Returns: boolean
                           },
"create_approval_chain_template":
{ Args: { "p_chain_type": string,"p_name": string,"p_steps": Json }; Returns: string
                           },
"create_company":
{ Args: { "p_archive_folder_name": string,"p_archive_local_path": string,"p_archive_storage_type": string,"p_logo_url": string,"p_name": string }; Returns: {
              "archive_folder_name": string,
"archive_local_path": string | null,
"archive_storage_type": string,
"company_code": string,
"company_code_expires_at": string | null,
"country_code": string,
"created_at": string,
"created_by": string | null,
"header_color": string,
"id": string,
"is_individual": boolean,
"logo_url": string | null,
"name": string,
"print_footer_url": string | null,
"print_full_page_url": string | null,
"print_header_url": string | null,
"print_margin_bottom": number,
"print_margin_left": number,
"print_margin_right": number,
"print_margin_top": number,
"print_mode": string,
"subscription_note": string | null,
"subscription_status": string,
"subscription_updated_at": string | null,
"subscription_updated_by": string | null,
"trial_ends_at": string,
"vat_rate": number
            }
                          SetofOptions: {
        from: "*"
        to: "companies"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_individual_account":
{ Args: { "p_full_name": string }; Returns: {
              "archive_folder_name": string,
"archive_local_path": string | null,
"archive_storage_type": string,
"company_code": string,
"company_code_expires_at": string | null,
"country_code": string,
"created_at": string,
"created_by": string | null,
"header_color": string,
"id": string,
"is_individual": boolean,
"logo_url": string | null,
"name": string,
"print_footer_url": string | null,
"print_full_page_url": string | null,
"print_header_url": string | null,
"print_margin_bottom": number,
"print_margin_left": number,
"print_margin_right": number,
"print_margin_top": number,
"print_mode": string,
"subscription_note": string | null,
"subscription_status": string,
"subscription_updated_at": string | null,
"subscription_updated_by": string | null,
"trial_ends_at": string,
"vat_rate": number
            }
                          SetofOptions: {
        from: "*"
        to: "companies"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_internal_request":
{ Args: { "p_chain_type": string,"p_description": string,"p_end_date": string,"p_note": string,"p_start_date": string,"p_steps": Json,"p_template_id": string,"p_title": string,"p_type": string }; Returns: string
                           },
"current_company_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"delete_approval_chain_template":
{ Args: { "p_template_id": string }; Returns: undefined
                           },
"delete_contract":
{ Args: { "p_contract_id": string }; Returns: undefined
                           },
"delete_internal_request":
{ Args: { "p_request_id": string }; Returns: undefined
                           },
"enqueue_storage_orphans":
{ Args: { "p_limit"?: number,"p_min_age_hours"?: number }; Returns: number
                           },
"finish_storage_cleanup":
{ Args: { "p_error"?: string,"p_id": string }; Returns: undefined
                           },
"generate_company_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"insert_approval_step":
{ Args: { "p_department_id": string,"p_note": string,"p_step_id": string,"p_user_id": string }; Returns: undefined
                           },
"insert_internal_approval_step":
{ Args: { "p_department_id": string,"p_note": string,"p_step_id": string,"p_user_id": string }; Returns: undefined
                           },
"is_company_owner":
{ Args: { "p_company_id": string }; Returns: boolean
                           },
"is_department_head":
{ Args: { "p_department_id": string }; Returns: boolean
                           },
"is_department_head_of_type":
{ Args: { "p_dept_type": string,"p_project_id": string }; Returns: boolean
                           },
"is_executive":
{ Args: { "p_company_id": string }; Returns: boolean
                           },
"is_platform_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"join_company_by_code":
{ Args: { "p_code": string }; Returns: {
              "result_company_id": string,"result_company_name": string
            }[]
                           },
"list_all_companies_billing":
{ Args: Record<PropertyKey, never>; Returns: {
              "created_at": string,"id": string,"is_individual": boolean,"member_count": number,"name": string,"subscription_note": string,"subscription_status": string,"subscription_updated_at": string,"trial_ends_at": string
            }[]
                           },
"notify_user":
{ Args: { "p_body": string,"p_company_id": string,"p_link": string,"p_title": string,"p_user_id": string }; Returns: undefined
                           },
"regenerate_company_code":
{ Args: { "p_company_id": string }; Returns: {
              "result_company_code": string,"result_expires_at": string
            }[]
                           },
"reroute_approval_step":
{ Args: { "p_step_id": string,"p_user_id": string }; Returns: undefined
                           },
"reroute_internal_approval_step":
{ Args: { "p_step_id": string,"p_user_id": string }; Returns: undefined
                           },
"reset_budget_entry_to_draft":
{ Args: { "p_entry_id": string }; Returns: undefined
                           },
"reset_contract_to_draft":
{ Args: { "p_contract_id": string }; Returns: undefined
                           },
"review_approval_step":
{ Args: { "p_approve": boolean,"p_note": string,"p_step_id": string }; Returns: undefined
                           },
"review_budget_entry":
{ Args: { "p_approve": boolean,"p_entry_id": string,"p_note": string }; Returns: undefined
                           },
"review_contract":
{ Args: { "p_approve": boolean,"p_contract_id": string,"p_note": string }; Returns: undefined
                           },
"review_contract_extra_work":
{ Args: { "p_approve": boolean,"p_extra_work_id": string,"p_note": string }; Returns: undefined
                           },
"review_contract_payment":
{ Args: { "p_approve": boolean,"p_note": string,"p_payment_id": string }; Returns: undefined
                           },
"review_contract_settlement":
{ Args: { "p_approve": boolean,"p_contract_id": string,"p_note": string }; Returns: undefined
                           },
"review_internal_approval_step":
{ Args: { "p_approve": boolean,"p_note": string,"p_step_id": string }; Returns: undefined
                           },
"route_approval_step":
{ Args: { "p_step_id": string,"p_user_id": string }; Returns: undefined
                           },
"route_internal_approval_step":
{ Args: { "p_step_id": string,"p_user_id": string }; Returns: undefined
                           },
"save_checklist_atomic":
{ Args: { "p_activity_id": string,"p_items": Json }; Returns: undefined
                           },
"save_contract_atomic":
{ Args: { "p_create": boolean,"p_data": Json,"p_id": string,"p_reset_to_draft": boolean }; Returns: string
                           },
"save_receiving_submission":
{ Args: { "p_activity_id": string,"p_create": boolean,"p_decision": string,"p_images": (string)[],"p_manager_name": string,"p_manager_signature_url": string,"p_notes": string,"p_results": Json,"p_submission_id": string }; Returns: {
              "activity_id": string,
"created_at": string,
"decision": string,
"id": string,
"manager_name": string,
"manager_signature_url": string | null,
"notes": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "submissions"
        isOneToOne: true
        isSetofReturn: false
      } },
"send_back_approval_step":
{ Args: { "p_note": string,"p_step_id": string,"p_target_step_id": string }; Returns: undefined
                           },
"send_back_internal_approval_step":
{ Args: { "p_note": string,"p_step_id": string,"p_target_step_id": string }; Returns: undefined
                           },
"set_company_subscription":
{ Args: { "p_company_id": string,"p_note": string,"p_status": string,"p_trial_ends_at": string }; Returns: undefined
                           },
"set_project_departments":
{ Args: { "p_department_id": string,"p_procurement_department_id": string,"p_project_id": string }; Returns: undefined
                           },
"submit_budget_entry":
{ Args: { "p_entry_id": string }; Returns: undefined
                           },
"submit_contract":
{ Args: { "p_contract_id": string }; Returns: undefined
                           },
"submit_contract_extra_work":
{ Args: { "p_extra_work_id": string }; Returns: undefined
                           },
"submit_contract_payment":
{ Args: { "p_payment_id": string }; Returns: undefined
                           },
"submit_contract_settlement":
{ Args: { "p_contract_id": string,"p_note": string }; Returns: undefined
                           },
"submit_material_purchase_chain":
{ Args: { "p_note": string,"p_request_id": string,"p_steps": Json }; Returns: string
                           },
"submit_material_sourcing":
{ Args: { "p_note": string,"p_request_id": string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
