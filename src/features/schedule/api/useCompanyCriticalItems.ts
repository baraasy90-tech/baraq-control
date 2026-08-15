import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapActivity } from "@/features/schedule/api/mapActivity";
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

      const { data: projectRows, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("company_id", companyId!);
      if (projectsError) throw projectsError;
      const projects = projectRows.map(mapProject);
      const projectIds = projects.map((p) => p.id);
      const projectById = new Map(projects.map((p) => [p.id, p]));
      if (projectIds.length === 0) return [];

      const { data: activityRows, error: activitiesError } = await supabase
        .from("activities")
        .select("*")
        .in("project_id", projectIds)
        .eq("critical", true)
        .eq("done", false);
      if (activitiesError) throw activitiesError;
      if (activityRows.length === 0) return [];

      const allActivityRows = await supabase.from("activities").select("*").in("project_id", projectIds);
      if (allActivityRows.error) throw allActivityRows.error;

      const activitiesByProject = new Map<string, ReturnType<typeof mapActivity>[]>();
      for (const row of allActivityRows.data) {
        const activity = mapActivity(row);
        const list = activitiesByProject.get(activity.projectId) ?? [];
        list.push(activity);
        activitiesByProject.set(activity.projectId, list);
      }

      const today = todayISO();
      const items: CriticalItem[] = [];

      for (const row of activityRows) {
        const project = projectById.get(row.project_id);
        if (!project) continue;
        const rawActivities = activitiesByProject.get(row.project_id) ?? [];
        const activities = withComputedDone(rawActivities);
        const schedule = computeSchedule(activities, customCalendars);
        const sc = schedule[row.id];
        const activity = activities.find((a) => a.id === row.id);
        if (!sc || !activity || activity.done) continue;

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

      return items.sort((a, b) => a.daysToStart - b.daysToStart);
    },
  });
}
