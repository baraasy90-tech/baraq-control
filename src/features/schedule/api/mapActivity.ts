import type { Database } from "@/lib/supabase/database.types";
import type { Activity, ChecklistItem } from "@/types/domain";

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type ChecklistItemRow = Database["public"]["Tables"]["checklist_items"]["Row"];

export function mapChecklistItem(row: ChecklistItemRow): ChecklistItem {
  return {
    id: row.id,
    activityId: row.activity_id,
    text: row.text,
    photoRequired: row.photo_required,
    order: row.order,
  };
}

export function mapActivity(row: ActivityRow, checklist: ChecklistItem[] = []): Activity {
  return {
    id: row.id,
    projectId: row.project_id,
    parentId: row.parent_id,
    name: row.name,
    code: row.code,
    order: row.order,
    durationDays: row.duration_days,
    done: row.done,
    startDate: row.start_date,
    actualStartDate: row.actual_start_date,
    actualEndDate: row.actual_end_date,
    calendarType: row.calendar_type,
    customCalendarId: row.custom_calendar_id,
    assignedTo: row.assigned_to,
    dependsOn: row.depends_on,
    depType: row.dep_type,
    lagDays: row.lag_days,
    lagUnit: row.lag_unit,
    critical: row.critical,
    alertLeadDays: row.alert_lead_days,
    requiresReceiving: row.requires_receiving,
    scopeType: row.scope_type,
    scopeRef: row.scope_ref,
    templateGroupId: row.template_group_id,
    budgetType: row.budget_type,
    plannedAmount: row.planned_amount,
    boqQty: row.boq_qty,
    boqUnit: row.boq_unit,
    boqUnitPrice: row.boq_unit_price,
    checklist,
    actualEntries: [],
    submissions: [],
  };
}
