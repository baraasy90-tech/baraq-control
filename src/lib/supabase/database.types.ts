// أنواع مطابقة لـ supabase/schema.sql
// عند تغيير السكيما، حدّث هذا الملف يدوياً (أو ولّده عبر: supabase gen types typescript)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          created_by: string;
          name: string;
          company_code: string;
          company_code_expires_at: string | null;
          country_code: string;
          logo_url: string | null;
          archive_folder_name: string;
          archive_storage_type: "cloud" | "local" | "drive";
          archive_local_path: string | null;
          created_at: string;
          print_mode: "none" | "header_footer" | "full_page";
          print_header_url: string | null;
          print_footer_url: string | null;
          print_full_page_url: string | null;
          print_margin_top: number;
          print_margin_bottom: number;
          print_margin_left: number;
          print_margin_right: number;
          header_color: string;
          vat_rate: number;
          subscription_status: "trial" | "active" | "expired" | "canceled";
          trial_ends_at: string;
          subscription_note: string | null;
          subscription_updated_by: string | null;
          subscription_updated_at: string | null;
          is_individual: boolean;
        };
        Insert: {
          id?: string;
          created_by?: string;
          name: string;
          company_code?: string;
          company_code_expires_at?: string | null;
          country_code?: string;
          logo_url?: string | null;
          archive_folder_name?: string;
          archive_storage_type?: "cloud" | "local" | "drive";
          archive_local_path?: string | null;
          created_at?: string;
          print_mode?: "none" | "header_footer" | "full_page";
          print_header_url?: string | null;
          print_footer_url?: string | null;
          print_full_page_url?: string | null;
          print_margin_top?: number;
          print_margin_bottom?: number;
          print_margin_left?: number;
          print_margin_right?: number;
          header_color?: string;
          vat_rate?: number;
          subscription_status?: "trial" | "active" | "expired" | "canceled";
          trial_ends_at?: string;
          subscription_note?: string | null;
          subscription_updated_by?: string | null;
          subscription_updated_at?: string | null;
          is_individual?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      platform_admins: {
        Row: { user_id: string; created_at: string };
        Insert: { user_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["platform_admins"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          company_id: string | null;
          created_at: string;
          signature_url: string | null;
        };
        Insert: {
          id: string;
          full_name?: string;
          company_id?: string | null;
          created_at?: string;
          signature_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          company_id: string;
          department_id: string | null;
          procurement_department_id: string | null;
          name: string;
          manager_name: string;
          location: string;
          map_link: string;
          area: string;
          units_count: string;
          project_type: string;
          manager_signature_url: string | null;
          theme_color: string;
          theme_icon: string;
          scope_config: Json | null;
          status: "preparing" | "active" | "completed";
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          department_id?: string | null;
          procurement_department_id?: string | null;
          name: string;
          manager_name?: string;
          location?: string;
          map_link?: string;
          area?: string;
          units_count?: string;
          project_type?: string;
          manager_signature_url?: string | null;
          theme_color?: string;
          theme_icon?: string;
          scope_config?: Json | null;
          status?: "preparing" | "active" | "completed";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [];
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: "manager" | "member";
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: "manager" | "member";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_members"]["Insert"]>;
        Relationships: [];
      };
      departments: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          type: "project_management" | "finance" | "hr" | "executive" | "procurement" | "custom";
          head_label: string | null;
          member_label: string | null;
          parent_department_id: string | null;
          position_x: number | null;
          position_y: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          type?: "project_management" | "finance" | "hr" | "executive" | "procurement" | "custom";
          head_label?: string | null;
          member_label?: string | null;
          parent_department_id?: string | null;
          position_x?: number | null;
          position_y?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["departments"]["Insert"]>;
        Relationships: [];
      };
      organizational_levels: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          order_index: number;
          is_management_level: boolean;
          is_employee_level: boolean;
          is_worker_level: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          order_index?: number;
          is_management_level?: boolean;
          is_employee_level?: boolean;
          is_worker_level?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizational_levels"]["Insert"]>;
        Relationships: [];
      };
      organizational_classifications: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizational_classifications"]["Insert"]>;
        Relationships: [];
      };
      job_titles: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["job_titles"]["Insert"]>;
        Relationships: [];
      };
      department_members: {
        Row: {
          id: string;
          department_id: string;
          user_id: string;
          role: "member" | "head";
          title: string | null;
          organizational_level_id: string | null;
          organizational_classification_id: string | null;
          job_title_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          user_id: string;
          role?: "member" | "head";
          title?: string | null;
          organizational_level_id?: string | null;
          organizational_classification_id?: string | null;
          job_title_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["department_members"]["Insert"]>;
        Relationships: [];
      };
      invites: {
        Row: {
          id: string;
          company_id: string;
          department_id: string;
          role: "member" | "head";
          email: string;
          token: string;
          invited_by: string;
          status: "pending" | "accepted" | "revoked";
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          department_id: string;
          role?: "member" | "head";
          email: string;
          token?: string;
          invited_by: string;
          status?: "pending" | "accepted" | "revoked";
          created_at?: string;
          expires_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invites"]["Insert"]>;
        Relationships: [];
      };
      custom_calendars: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          working_weekdays: number[];
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          working_weekdays: number[];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["custom_calendars"]["Insert"]>;
        Relationships: [];
      };
      company_holidays: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          holiday_date: string;
          recurring_yearly: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          holiday_date: string;
          recurring_yearly?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["company_holidays"]["Insert"]>;
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          project_id: string;
          parent_id: string | null;
          name: string;
          order: number;
          duration_days: number;
          done: boolean;
          start_date: string | null;
          calendar_type: "calendar" | "workdays";
          custom_calendar_id: string | null;
          depends_on: string | null;
          dep_type: "SS" | "FS" | null;
          lag_days: number;
          lag_unit: "day" | "month";
          critical: boolean;
          alert_lead_days: number;
          requires_receiving: boolean;
          scope_type: "project" | "zone" | "unit" | "facility";
          scope_ref: string | null;
          template_group_id: string | null;
          budget_type: "lumpsum" | "boq" | null;
          planned_amount: number | null;
          boq_qty: number | null;
          boq_unit: string | null;
          boq_unit_price: number | null;
          created_at: string;
          assigned_to: string | null;
          code: string | null;
          actual_start_date: string | null;
          actual_end_date: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          parent_id?: string | null;
          name: string;
          order?: number;
          duration_days?: number;
          done?: boolean;
          start_date?: string | null;
          calendar_type?: "calendar" | "workdays";
          custom_calendar_id?: string | null;
          depends_on?: string | null;
          dep_type?: "SS" | "FS" | null;
          lag_days?: number;
          lag_unit?: "day" | "month";
          critical?: boolean;
          alert_lead_days?: number;
          requires_receiving?: boolean;
          scope_type?: "project" | "zone" | "unit" | "facility";
          scope_ref?: string | null;
          template_group_id?: string | null;
          budget_type?: "lumpsum" | "boq" | null;
          planned_amount?: number | null;
          boq_qty?: number | null;
          boq_unit?: string | null;
          boq_unit_price?: number | null;
          created_at?: string;
          assigned_to?: string | null;
          code?: string | null;
          actual_start_date?: string | null;
          actual_end_date?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["activities"]["Insert"]>;
        Relationships: [];
      };
      checklist_items: {
        Row: {
          id: string;
          activity_id: string;
          text: string;
          photo_required: boolean;
          order: number;
        };
        Insert: {
          id?: string;
          activity_id: string;
          text: string;
          photo_required?: boolean;
          order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["checklist_items"]["Insert"]>;
        Relationships: [];
      };
      submissions: {
        Row: {
          id: string;
          activity_id: string;
          manager_name: string;
          manager_signature_url: string | null;
          decision: "approved" | "approvedWithNotes" | "rejected";
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_id: string;
          manager_name?: string;
          manager_signature_url?: string | null;
          decision: "approved" | "approvedWithNotes" | "rejected";
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["submissions"]["Insert"]>;
        Relationships: [];
      };
      checklist_results: {
        Row: {
          id: string;
          submission_id: string;
          checklist_item_id: string | null;
          checked: boolean;
          image_url: string | null;
        };
        Insert: {
          id?: string;
          submission_id: string;
          checklist_item_id?: string | null;
          checked?: boolean;
          image_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["checklist_results"]["Insert"]>;
        Relationships: [];
      };
      submission_images: {
        Row: {
          id: string;
          submission_id: string;
          image_url: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          image_url: string;
        };
        Update: Partial<Database["public"]["Tables"]["submission_images"]["Insert"]>;
        Relationships: [];
      };
      budget_actual_entries: {
        Row: {
          id: string;
          activity_id: string;
          date: string;
          amount: number;
          source: string;
          note: string | null;
          contract_ref: string | null;
        };
        Insert: {
          id?: string;
          activity_id: string;
          date: string;
          amount?: number;
          source?: string;
          note?: string | null;
          contract_ref?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["budget_actual_entries"]["Insert"]>;
        Relationships: [];
      };
      document_folders: {
        Row: {
          id: string;
          project_id: string;
          parent_folder_id: string | null;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          parent_folder_id?: string | null;
          name: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_folders"]["Insert"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          status: "todo" | "in_progress" | "done";
          priority: "low" | "medium" | "high";
          due_date: string | null;
          assigned_to: string | null;
          created_by: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string | null;
          status?: "todo" | "in_progress" | "done";
          priority?: "low" | "medium" | "high";
          due_date?: string | null;
          assigned_to?: string | null;
          created_by: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          folder_id: string;
          name: string;
          file_url: string;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          folder_id: string;
          name: string;
          file_url: string;
          uploaded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
        Relationships: [];
      };
      contracts: {
        Row: {
          id: string;
          project_id: string;
          pdf_url: string | null;
          start_date: string | null;
          duration_days: number | null;
          total_value: number | null;
          payment_terms: string | null;
          has_advance_payment: boolean;
          advance_payment_percentage: number | null;
          advance_payment_guarantee_note: string | null;
          advance_deduction_percentage: number | null;
          retention_percentage: number | null;
          retention_released: boolean;
          retention_release_note: string | null;
          created_at: string;
          contract_name: string;
          status: "draft" | "pending_pm_approval" | "pending_finance_approval" | "approved" | "rejected";
          submitted_by: string | null;
          submitted_at: string | null;
          pm_reviewed_by: string | null;
          pm_reviewed_at: string | null;
          pm_review_note: string | null;
          finance_reviewed_by: string | null;
          finance_reviewed_at: string | null;
          finance_review_note: string | null;
          settlement_status: "open" | "pending_pm_approval" | "pending_finance_approval" | "settled" | "rejected";
          settlement_note: string | null;
          settlement_submitted_by: string | null;
          settlement_submitted_at: string | null;
          settlement_pm_reviewed_by: string | null;
          settlement_pm_reviewed_at: string | null;
          settlement_pm_review_note: string | null;
          settlement_finance_reviewed_by: string | null;
          settlement_finance_reviewed_at: string | null;
          settlement_finance_review_note: string | null;
          settled_at: string | null;
          vat_inclusive: boolean;
          vat_rate: number | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          pdf_url?: string | null;
          start_date?: string | null;
          duration_days?: number | null;
          total_value?: number | null;
          payment_terms?: string | null;
          has_advance_payment?: boolean;
          advance_payment_percentage?: number | null;
          advance_payment_guarantee_note?: string | null;
          advance_deduction_percentage?: number | null;
          retention_percentage?: number | null;
          retention_released?: boolean;
          retention_release_note?: string | null;
          created_at?: string;
          contract_name?: string;
          status?: "draft" | "pending_pm_approval" | "pending_finance_approval" | "approved" | "rejected";
          submitted_by?: string | null;
          submitted_at?: string | null;
          pm_reviewed_by?: string | null;
          pm_reviewed_at?: string | null;
          pm_review_note?: string | null;
          finance_reviewed_by?: string | null;
          finance_reviewed_at?: string | null;
          finance_review_note?: string | null;
          settlement_status?: "open" | "pending_pm_approval" | "pending_finance_approval" | "settled" | "rejected";
          settlement_note?: string | null;
          settlement_submitted_by?: string | null;
          settlement_submitted_at?: string | null;
          settlement_pm_reviewed_by?: string | null;
          settlement_pm_reviewed_at?: string | null;
          settlement_pm_review_note?: string | null;
          settlement_finance_reviewed_by?: string | null;
          settlement_finance_reviewed_at?: string | null;
          settlement_finance_review_note?: string | null;
          settled_at?: string | null;
          vat_inclusive?: boolean;
          vat_rate?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["contracts"]["Insert"]>;
        Relationships: [];
      };
      contract_line_items: {
        Row: {
          id: string;
          contract_id: string;
          description: string;
          quantity: number | null;
          unit: string | null;
          unit_price: number | null;
          order: number;
        };
        Insert: {
          id?: string;
          contract_id: string;
          description: string;
          quantity?: number | null;
          unit?: string | null;
          unit_price?: number | null;
          order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["contract_line_items"]["Insert"]>;
        Relationships: [];
      };
      contract_payments: {
        Row: {
          id: string;
          contract_id: string;
          title: string;
          due_date: string | null;
          amount: number | null;
          percentage: number | null;
          paid: boolean;
          guarantee_note: string | null;
          order: number;
          is_advance_payment: boolean;
          status: "pending" | "pending_pm_approval" | "pending_finance_approval" | "approved" | "rejected";
          submitted_by: string | null;
          submitted_at: string | null;
          pm_reviewed_by: string | null;
          pm_reviewed_at: string | null;
          pm_review_note: string | null;
          finance_reviewed_by: string | null;
          finance_reviewed_at: string | null;
          finance_review_note: string | null;
        };
        Insert: {
          id?: string;
          contract_id: string;
          title: string;
          due_date?: string | null;
          amount?: number | null;
          percentage?: number | null;
          paid?: boolean;
          guarantee_note?: string | null;
          order?: number;
          is_advance_payment?: boolean;
          status?: "pending" | "pending_pm_approval" | "pending_finance_approval" | "approved" | "rejected";
          submitted_by?: string | null;
          submitted_at?: string | null;
          pm_reviewed_by?: string | null;
          pm_reviewed_at?: string | null;
          pm_review_note?: string | null;
          finance_reviewed_by?: string | null;
          finance_reviewed_at?: string | null;
          finance_review_note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["contract_payments"]["Insert"]>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          company_id: string;
          project_id: string | null;
          table_name: string;
          record_id: string;
          action: "insert" | "update" | "delete";
          actor_id: string | null;
          old_data: Record<string, unknown> | null;
          new_data: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          project_id?: string | null;
          table_name: string;
          record_id: string;
          action: "insert" | "update" | "delete";
          actor_id?: string | null;
          old_data?: Record<string, unknown> | null;
          new_data?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          title: string;
          body: string | null;
          link: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          title: string;
          body?: string | null;
          link?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      internal_requests: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          type: "leave" | "contract_renewal" | "other" | null;
          title: string;
          description: string | null;
          start_date: string | null;
          end_date: string | null;
          status: "pending" | "approved" | "rejected";
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          type?: "leave" | "contract_renewal" | "other" | null;
          title: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["internal_requests"]["Insert"]>;
        Relationships: [];
      };
      approval_chain_templates: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          chain_type: "linear" | "network";
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          chain_type?: "linear" | "network";
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["approval_chain_templates"]["Insert"]>;
        Relationships: [];
      };
      approval_chain_template_steps: {
        Row: {
          id: string;
          template_id: string;
          step_order: number;
          department_id: string | null;
          assigned_user_id: string | null;
        };
        Insert: {
          id?: string;
          template_id: string;
          step_order: number;
          department_id?: string | null;
          assigned_user_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["approval_chain_template_steps"]["Insert"]>;
        Relationships: [];
      };
      internal_approval_chains: {
        Row: {
          id: string;
          internal_request_id: string;
          chain_type: "linear" | "network";
          status: "pending" | "approved" | "rejected";
          created_by: string | null;
          created_at: string;
          decided_at: string | null;
          requester_note: string | null;
        };
        Insert: {
          id?: string;
          internal_request_id: string;
          chain_type?: "linear" | "network";
          status?: "pending" | "approved" | "rejected";
          created_by?: string | null;
          created_at?: string;
          decided_at?: string | null;
          requester_note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["internal_approval_chains"]["Insert"]>;
        Relationships: [];
      };
      internal_approval_chain_steps: {
        Row: {
          id: string;
          chain_id: string;
          step_order: number;
          department_id: string | null;
          assigned_user_id: string | null;
          status: "pending" | "approved" | "rejected" | "skipped";
          routed_by: string | null;
          routed_at: string | null;
          acted_by: string | null;
          acted_at: string | null;
          note: string | null;
          inserted_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          chain_id: string;
          step_order: number;
          department_id?: string | null;
          assigned_user_id?: string | null;
          status?: "pending" | "approved" | "rejected" | "skipped";
          routed_by?: string | null;
          routed_at?: string | null;
          acted_by?: string | null;
          acted_at?: string | null;
          note?: string | null;
          inserted_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["internal_approval_chain_steps"]["Insert"]>;
        Relationships: [];
      };
      internal_request_attachments: {
        Row: {
          id: string;
          request_id: string;
          file_name: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          file_name: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["internal_request_attachments"]["Insert"]>;
        Relationships: [];
      };
      internal_request_attachment_revisions: {
        Row: {
          id: string;
          attachment_id: string;
          revision_number: number;
          file_url: string;
          uploaded_by: string | null;
          uploaded_at: string;
          note: string | null;
        };
        Insert: {
          id?: string;
          attachment_id: string;
          revision_number: number;
          file_url: string;
          uploaded_by?: string | null;
          uploaded_at?: string;
          note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["internal_request_attachment_revisions"]["Insert"]>;
        Relationships: [];
      };
      contract_extra_works: {
        Row: {
          id: string;
          contract_id: string;
          title: string;
          description: string | null;
          amount: number;
          created_by: string | null;
          created_at: string;
          status: "draft" | "pending_pm_approval" | "pending_finance_approval" | "approved" | "rejected";
          submitted_by: string | null;
          submitted_at: string | null;
          pm_reviewed_by: string | null;
          pm_reviewed_at: string | null;
          pm_review_note: string | null;
          finance_reviewed_by: string | null;
          finance_reviewed_at: string | null;
          finance_review_note: string | null;
        };
        Insert: {
          id?: string;
          contract_id: string;
          title: string;
          description?: string | null;
          amount: number;
          created_by?: string | null;
          created_at?: string;
          status?: "draft" | "pending_pm_approval" | "pending_finance_approval" | "approved" | "rejected";
          submitted_by?: string | null;
          submitted_at?: string | null;
          pm_reviewed_by?: string | null;
          pm_reviewed_at?: string | null;
          pm_review_note?: string | null;
          finance_reviewed_by?: string | null;
          finance_reviewed_at?: string | null;
          finance_review_note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["contract_extra_works"]["Insert"]>;
        Relationships: [];
      };
      contract_deductions: {
        Row: {
          id: string;
          contract_id: string;
          violation_name: string;
          deduction_amount: number;
          damage_description: string | null;
          deducted_at: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          violation_name: string;
          deduction_amount: number;
          damage_description?: string | null;
          deducted_at?: string;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contract_deductions"]["Insert"]>;
        Relationships: [];
      };
      material_requests: {
        Row: {
          id: string;
          project_id: string;
          item_name: string;
          description: string | null;
          created_by: string | null;
          created_at: string;
          status:
            | "draft"
            | "sample_pending"
            | "sample_approved"
            | "sample_rejected"
            | "purchase_pending"
            | "purchase_approved"
            | "purchase_rejected";
          quantity: number | null;
          target_unit_price: number | null;
          needed_by: string | null;
          attachments_note: string | null;
          quote_price: number | null;
          quote_received_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          item_name: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          status?:
            | "draft"
            | "sample_pending"
            | "sample_approved"
            | "sample_rejected"
            | "purchase_pending"
            | "purchase_approved"
            | "purchase_rejected";
          quantity?: number | null;
          target_unit_price?: number | null;
          needed_by?: string | null;
          attachments_note?: string | null;
          quote_price?: number | null;
          quote_received_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["material_requests"]["Insert"]>;
        Relationships: [];
      };
      material_request_options: {
        Row: {
          id: string;
          material_request_id: string;
          description: string;
          price: number | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          material_request_id: string;
          description: string;
          price?: number | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["material_request_options"]["Insert"]>;
        Relationships: [];
      };
      material_request_attachments: {
        Row: {
          id: string;
          material_request_id: string;
          option_id: string | null;
          phase: "sample" | "purchase";
          file_url: string;
          file_name: string;
          uploaded_by: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          material_request_id: string;
          option_id?: string | null;
          phase?: "sample" | "purchase";
          file_url: string;
          file_name: string;
          uploaded_by?: string | null;
          uploaded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["material_request_attachments"]["Insert"]>;
        Relationships: [];
      };
      approval_chains: {
        Row: {
          id: string;
          material_request_id: string;
          phase: "sample" | "purchase";
          chain_type: "linear" | "network";
          status: "pending" | "approved" | "rejected";
          created_by: string | null;
          created_at: string;
          decided_at: string | null;
          requester_note: string | null;
        };
        Insert: {
          id?: string;
          material_request_id: string;
          phase: "sample" | "purchase";
          chain_type?: "linear" | "network";
          status?: "pending" | "approved" | "rejected";
          created_by?: string | null;
          created_at?: string;
          decided_at?: string | null;
          requester_note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["approval_chains"]["Insert"]>;
        Relationships: [];
      };
      approval_chain_steps: {
        Row: {
          id: string;
          chain_id: string;
          step_order: number;
          department_id: string | null;
          assigned_user_id: string | null;
          status: "pending" | "approved" | "rejected" | "skipped";
          routed_by: string | null;
          routed_at: string | null;
          acted_by: string | null;
          acted_at: string | null;
          note: string | null;
          inserted_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          chain_id: string;
          step_order: number;
          department_id?: string | null;
          assigned_user_id?: string | null;
          status?: "pending" | "approved" | "rejected" | "skipped";
          routed_by?: string | null;
          routed_at?: string | null;
          acted_by?: string | null;
          acted_at?: string | null;
          note?: string | null;
          inserted_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["approval_chain_steps"]["Insert"]>;
        Relationships: [];
      };
      budget_reconciliation_notes: {
        Row: {
          id: string;
          project_id: string;
          contract_value: number | null;
          tracked_budget_value: number | null;
          note: string;
          created_by: string;
          created_at: string;
          status: "pending" | "approved" | "rejected";
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_note: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          contract_value?: number | null;
          tracked_budget_value?: number | null;
          note: string;
          created_by: string;
          created_at?: string;
          status?: "pending" | "approved" | "rejected";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["budget_reconciliation_notes"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      accept_invite: {
        Args: { p_token: string };
        Returns: {
          result_company_id: string;
          result_company_name: string;
          result_department_id: string;
          result_role: "member" | "head";
        }[];
      };
      join_company_by_code: {
        Args: { p_code: string };
        Returns: { result_company_id: string; result_company_name: string }[];
      };
      review_contract: {
        Args: { p_contract_id: string; p_approve: boolean; p_note: string | null };
        Returns: undefined;
      };
      review_contract_payment: {
        Args: { p_payment_id: string; p_approve: boolean; p_note: string | null };
        Returns: undefined;
      };
      submit_contract_extra_work: {
        Args: { p_extra_work_id: string };
        Returns: undefined;
      };
      review_contract_extra_work: {
        Args: { p_extra_work_id: string; p_approve: boolean; p_note: string | null };
        Returns: undefined;
      };
      submit_contract_settlement: {
        Args: { p_contract_id: string; p_note: string | null };
        Returns: undefined;
      };
      review_contract_settlement: {
        Args: { p_contract_id: string; p_approve: boolean; p_note: string | null };
        Returns: undefined;
      };
      create_approval_chain_template: {
        Args: { p_name: string; p_chain_type: string; p_steps: Json };
        Returns: string;
      };
      delete_approval_chain_template: {
        Args: { p_template_id: string };
        Returns: undefined;
      };
      create_internal_request: {
        Args: {
          p_type: string | null;
          p_title: string;
          p_description: string | null;
          p_start_date: string | null;
          p_end_date: string | null;
          p_chain_type: string | null;
          p_steps: Json | null;
          p_note: string | null;
          p_template_id: string | null;
        };
        Returns: string;
      };
      route_internal_approval_step: {
        Args: { p_step_id: string; p_user_id: string };
        Returns: undefined;
      };
      insert_internal_approval_step: {
        Args: { p_step_id: string; p_department_id: string | null; p_user_id: string | null; p_note: string | null };
        Returns: undefined;
      };
      review_internal_approval_step: {
        Args: { p_step_id: string; p_approve: boolean; p_note: string | null };
        Returns: undefined;
      };
      send_back_internal_approval_step: {
        Args: { p_step_id: string; p_target_step_id: string; p_note: string | null };
        Returns: undefined;
      };
      add_internal_request_attachment: {
        Args: { p_request_id: string; p_file_name: string; p_file_url: string };
        Returns: string;
      };
      add_internal_request_attachment_revision: {
        Args: { p_attachment_id: string; p_file_url: string; p_note: string | null };
        Returns: string;
      };
      submit_material_sourcing: {
        Args: { p_request_id: string; p_note: string | null };
        Returns: string;
      };
      submit_material_purchase_chain: {
        Args: { p_request_id: string; p_steps: Json; p_note: string | null };
        Returns: string;
      };
      route_approval_step: {
        Args: { p_step_id: string; p_user_id: string };
        Returns: undefined;
      };
      insert_approval_step: {
        Args: { p_step_id: string; p_department_id: string | null; p_user_id: string | null; p_note: string | null };
        Returns: undefined;
      };
      review_approval_step: {
        Args: { p_step_id: string; p_approve: boolean; p_note: string | null };
        Returns: undefined;
      };
      send_back_approval_step: {
        Args: { p_step_id: string; p_target_step_id: string; p_note: string };
        Returns: undefined;
      };
      submit_contract: {
        Args: { p_contract_id: string };
        Returns: undefined;
      };
      submit_contract_payment: {
        Args: { p_payment_id: string };
        Returns: undefined;
      };
      reset_contract_to_draft: {
        Args: { p_contract_id: string };
        Returns: undefined;
      };
      is_platform_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      set_company_subscription: {
        Args: { p_company_id: string; p_status: string; p_trial_ends_at: string | null; p_note: string | null };
        Returns: undefined;
      };
      list_all_companies_billing: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          name: string;
          subscription_status: "trial" | "active" | "expired" | "canceled";
          trial_ends_at: string;
          subscription_note: string | null;
          subscription_updated_at: string | null;
          created_at: string;
          member_count: number;
          is_individual: boolean;
        }[];
      };
      create_company: {
        Args: {
          p_name: string;
          p_logo_url: string | null;
          p_archive_folder_name: string;
          p_archive_storage_type: string;
          p_archive_local_path: string | null;
        };
        Returns: Database["public"]["Tables"]["companies"]["Row"];
      };
      reroute_approval_step: {
        Args: { p_step_id: string; p_user_id: string };
        Returns: undefined;
      };
      reroute_internal_approval_step: {
        Args: { p_step_id: string; p_user_id: string };
        Returns: undefined;
      };
      delete_internal_request: {
        Args: { p_request_id: string };
        Returns: undefined;
      };
      create_individual_account: {
        Args: { p_full_name: string };
        Returns: Database["public"]["Tables"]["companies"]["Row"];
      };
      regenerate_company_code: {
        Args: { p_company_id: string };
        Returns: { result_company_code: string; result_expires_at: string }[];
      };
      set_project_departments: {
        Args: { p_project_id: string; p_department_id: string | null; p_procurement_department_id: string | null };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
