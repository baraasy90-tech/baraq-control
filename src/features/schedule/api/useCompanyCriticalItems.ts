import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { loadActivities } from "@/features/schedule/api/useActivities";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import type { Activity } from "@/types/domain";
import { mapProject } from "@/features/projects/api/mapProject";
import { computeSchedule } from "@/features/schedule/lib/schedule";
import { withComputedDone } from "@/features/schedule/lib/completion";
import { todayISO } from "@/utils/dates";

export interface CriticalItem {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  startDate: string;
  daysToStart: number;
  leadDays: number;
}

/** كل البنود التي تتطلب طلباً وتوريداً مسبقاً (critical) وغير مكتملة بعد، بلا حد زمني —
 * لتبقى ظاهرة دائماً في قسم المهام حتى لو كانت بعيدة، فلا تُنسى. */
export function useCompanyCriticalItems(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-critical-items", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<CriticalItem[]> => {
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
      const items: CriticalItem[] = [];

      for (const [projectId, rawActivities] of activitiesByProject) {
        const project = projectById.get(projectId);
        if (!project) continue;
        const activities = withComputedDone(rawActivities);
        const schedule = computeSchedule(activities, customCalendars);
        for (const activity of activities) {
          const sc = schedule[activity.id];
          if (!sc || !activity.critical || activity.done) continue;
          items.push({
          id: activity.id,
          projectId: project.id,
          projectName: project.name,
          name: activity.name,
          startDate: sc.start,
          daysToStart: Math.round((new Date(sc.start).getTime() - new Date(today).getTime()) / 86400000),
          leadDays: activity.alertLeadDays ?? 7,
          });
        }
      }

      return items.sort((a, b) => a.daysToStart - b.daysToStart);
    },
  });
}
