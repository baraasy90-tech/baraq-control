import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type ActivityUpdate = Database["public"]["Tables"]["activities"]["Update"];

export interface UpdateActivityInput {
  id: string;
  projectId: string;
  name?: string;
  parentId?: string | null;
  order?: number;
  durationDays?: number;
  done?: boolean;
  startDate?: string | null;
  calendarType?: "calendar" | "workdays";
  customCalendarId?: string | null;
  assignedTo?: string | null;
  dependsOn?: string | null;
  depType?: "SS" | "FS" | null;
  lagDays?: number;
  lagUnit?: "day" | "month";
  critical?: boolean;
  alertLeadDays?: number;
  requiresReceiving?: boolean;
  scopeType?: "project" | "zone" | "unit" | "facility";
  scopeRef?: string | null;
  budgetType?: "lumpsum" | "boq" | null;
  plannedAmount?: number | null;
  boqQty?: number | null;
  boqUnit?: string | null;
  boqUnitPrice?: number | null;
}

export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateActivityInput) => {
      const patch: ActivityUpdate = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.parentId !== undefined) patch.parent_id = input.parentId;
      if (input.order !== undefined) patch.order = input.order;
      if (input.durationDays !== undefined) patch.duration_days = input.durationDays;
      if (input.done !== undefined) patch.done = input.done;
      if (input.startDate !== undefined) patch.start_date = input.startDate;
      if (input.calendarType !== undefined) patch.calendar_type = input.calendarType;
      if (input.customCalendarId !== undefined) patch.custom_calendar_id = input.customCalendarId;
      if (input.assignedTo !== undefined) patch.assigned_to = input.assignedTo;
      if (input.dependsOn !== undefined) patch.depends_on = input.dependsOn;
      if (input.depType !== undefined) patch.dep_type = input.depType;
      if (input.lagDays !== undefined) patch.lag_days = input.lagDays;
      if (input.lagUnit !== undefined) patch.lag_unit = input.lagUnit;
      if (input.critical !== undefined) patch.critical = input.critical;
      if (input.alertLeadDays !== undefined) patch.alert_lead_days = input.alertLeadDays;
      if (input.requiresReceiving !== undefined) patch.requires_receiving = input.requiresReceiving;
      if (input.scopeType !== undefined) patch.scope_type = input.scopeType;
      if (input.scopeRef !== undefined) patch.scope_ref = input.scopeRef;
      if (input.budgetType !== undefined) patch.budget_type = input.budgetType;
      if (input.plannedAmount !== undefined) patch.planned_amount = input.plannedAmount;
      if (input.boqQty !== undefined) patch.boq_qty = input.boqQty;
      if (input.boqUnit !== undefined) patch.boq_unit = input.boqUnit;
      if (input.boqUnitPrice !== undefined) patch.boq_unit_price = input.boqUnitPrice;

      const { error } = await supabase.from("activities").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["activities", input.projectId] });
    },
  });
}
