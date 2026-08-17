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
        };
        Insert: {
          id?: string;
          created_by?: string;
          name: string;
          company_code?: string;
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
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          company_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          company_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          company_id: string;
          department_id: string | null;
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
          type: "project_management" | "finance" | "hr" | "executive" | "custom";
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
          type?: "project_management" | "finance" | "hr" | "executive" | "custom";
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
      department_members: {
        Row: {
          id: string;
          department_id: string;
          user_id: string;
          role: "member" | "head";
          created_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          user_id: string;
          role?: "member" | "head";
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
        };
        Update: Partial<Database["public"]["Tables"]["contract_payments"]["Insert"]>;
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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
