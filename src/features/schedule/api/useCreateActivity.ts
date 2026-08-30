import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type ActivityInsert = Database["public"]["Tables"]["activities"]["Insert"];

export interface CreateActivityInput {
  projectId: string;
  parentId: string | null;
  name: string;
  code: string | null;
  order: number;
  durationDays: number;
  startDate: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  calendarType: "calendar" | "workdays";
  customCalendarId?: string | null;
  assignedTo?: string | null;
  dependsOn: string | null;
  depType: "SS" | "FS" | null;
  lagDays: number;
  lagUnit: "day" | "month";
  critical: boolean;
  alertLeadDays: number;
  requiresReceiving: boolean;
  scopeType: "project" | "zone" | "unit" | "facility";
  scopeRef: string | null;
  budgetType: "lumpsum" | "boq" | null;
  plannedAmount: number | null;
  boqQty: number | null;
  boqUnit: string | null;
  boqUnitPrice: number | null;
  linkedContractId?: string | null;
}

export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateActivityInput) => {
      const payload: ActivityInsert = {
        project_id: input.projectId,
        parent_id: input.parentId,
        name: input.name,
        code: input.code,
        order: input.order,
        duration_days: input.durationDays,
        start_date: input.startDate,
        actual_start_date: input.actualStartDate ?? null,
        actual_end_date: input.actualEndDate ?? null,
        calendar_type: input.calendarType,
        custom_calendar_id: input.customCalendarId ?? null,
        assigned_to: input.assignedTo ?? null,
        depends_on: input.dependsOn,
        dep_type: input.depType,
        lag_days: input.lagDays,
        lag_unit: input.lagUnit,
        critical: input.critical,
        alert_lead_days: input.alertLeadDays,
        requires_receiving: input.requiresReceiving,
        scope_type: input.scopeType,
        scope_ref: input.scopeRef,
        budget_type: input.budgetType,
        planned_amount: input.plannedAmount,
        boq_qty: input.boqQty,
        boq_unit: input.boqUnit,
        boq_unit_price: input.boqUnitPrice,
        linked_contract_id: input.linkedContractId ?? null,
      };
      const { data, error } = await supabase.from("activities").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (activity) => {
      queryClient.invalidateQueries({ queryKey: ["activities", activity.project_id] });
    },
  });
}
