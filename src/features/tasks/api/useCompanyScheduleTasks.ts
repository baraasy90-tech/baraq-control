import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { loadActivities } from "@/features/schedule/api/useActivities";
import { fetchAllRows, fetchRowsByIds } from "@/lib/supabase/fetchAllRows";
import { todayISO } from "@/utils/dates";
import type { Activity } from "@/types/domain";
import { mapProject } from "@/features/projects/api/mapProject";
import { computeSchedule } from "@/features/schedule/lib/schedule";
import { withComputedDone, getCompletionDates } from "@/features/schedule/lib/completion";
import type { TaskStatus } from "@/types/domain";

export interface ScheduleTaskItem {
  id: string;
  projectId: string;
  projectName: string;
  projectThemeColor: string;
  title: string;
  status: TaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  assignedTo: string | null;
  assigneeName: string | null;
}

/** بنود الجدول الزمني (المراحل) المُسندة لأعضاء الفريق — تُعرض كـ"مهام" ضمن قسم المهام العام. */
export function useCompanyScheduleTasks(companyId: string | undefined) {
  return useQuery({
    queryKey: ["schedule-tasks", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<ScheduleTaskItem[]> => {
      const { data: calendarRows, error: calendarsError } = await supabase
        .from("custom_calendars")
        .select("id, working_weekdays")
        .eq("company_id", companyId!);
      if (calendarsError) throw calendarsError;
      const customCalendars = new Map(calendarRows.map((c) => [c.id, c.working_weekdays]));

      const projectRows = await fetchAllRows((from, to) => supabase
        .from("projects")
        .select("*")
        .eq("company_id", companyId!).order("id").range(from, to));
      const projects = projectRows.map(mapProject);
      const projectIds = projects.map((p) => p.id);
      const projectById = new Map(projects.map((p) => [p.id, p]));
      if (projectIds.length === 0) return [];

      const activitiesByProject = new Map<string, Activity[]>();
      for (const activity of await loadActivities(projectIds, false)) {
        const list = activitiesByProject.get(activity.projectId) ?? [];
        list.push(activity);
        activitiesByProject.set(activity.projectId, list);
      }

      const today = todayISO();
      const items: ScheduleTaskItem[] = [];

      for (const [projectId, rawActivities] of activitiesByProject) {
        const project = projectById.get(projectId);
        if (!project) continue;
        const activities = withComputedDone(rawActivities);
        const schedule = computeSchedule(activities, customCalendars);
        const completionDates = getCompletionDates(activities);

        for (const activity of activities) {
          if (!activity.assignedTo) continue;
          const sc = schedule[activity.id];
          if (!sc) continue;
          const status: TaskStatus = activity.done ? "done" : sc.start <= today && today <= sc.end ? "in_progress" : "todo";
          items.push({
            id: activity.id,
            projectId,
            projectName: project.name,
            projectThemeColor: project.themeColor,
            title: activity.name,
            status,
            dueDate: sc.end,
            completedAt: activity.done ? (completionDates.get(activity.id) ?? sc.end) : null,
            assignedTo: activity.assignedTo,
            assigneeName: null,
          });
        }
      }

      const assigneeIds = [...new Set(items.map((i) => i.assignedTo).filter((id): id is string => !!id))];
      if (assigneeIds.length > 0) {
        const profiles = await fetchRowsByIds(assigneeIds, (ids, from, to) => supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids).order("id").range(from, to));
        const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));
        for (const item of items) {
          item.assigneeName = item.assignedTo ? (nameById.get(item.assignedTo) ?? "بدون اسم") : null;
        }
      }

      return items;
    },
  });
}
