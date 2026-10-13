import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { loadActivities } from "@/features/schedule/api/useActivities";
import { withComputedDone } from "@/features/schedule/lib/completion";
import { fetchAllRows, fetchRowsByIds } from "@/lib/supabase/fetchAllRows";
import { todayISO } from "@/utils/dates";
import { mapProject } from "@/features/projects/api/mapProject";
import { computeSchedule, getLatePhases, getCriticalUpcoming } from "@/features/schedule/lib/schedule";
import { getPlannedAmount, getActualAmount } from "@/features/budget/lib/budget";
import type { Project, ProjectStatus, TaskStatus } from "@/types/domain";

export interface LatePhaseInfo {
  projectId: string;
  projectName: string;
  activityName: string;
  end: string;
}

export interface UpcomingCriticalInfo {
  projectId: string;
  projectName: string;
  activityName: string;
  daysToStart: number;
}

export interface BudgetOverview {
  planned: number;
  actual: number;
  variance: number;
}

export interface CompanyOverview {
  projects: Project[];
  projectStatusCounts: Record<ProjectStatus, number>;
  taskStatusCounts: Record<TaskStatus, number>;
  overdueTaskCount: number;
  latePhases: LatePhaseInfo[];
  upcomingCritical: UpcomingCriticalInfo[];
  budget: BudgetOverview;
  pendingReceivingCount: number;
}

export function useCompanyOverview(companyId: string | undefined) {
  return useQuery({
    queryKey: ["overview", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<CompanyOverview> => {
      const { data: calendarRows, error: calendarsError } = await supabase
        .from("custom_calendars")
        .select("id, working_weekdays")
        .eq("company_id", companyId!);
      if (calendarsError) throw calendarsError;
      const customCalendars = new Map(calendarRows.map((c) => [c.id, c.working_weekdays]));

      const projectRows = await fetchAllRows((from, to) => supabase.from("projects").select("*")
        .eq("company_id", companyId!).order("id").range(from, to));
      const projects = projectRows.map(mapProject);
      const projectIds = projects.map((p) => p.id);
      const projectById = new Map(projects.map((p) => [p.id, p]));

      const projectStatusCounts: Record<ProjectStatus, number> = { preparing: 0, active: 0, completed: 0 };
      for (const p of projects) projectStatusCounts[p.status]++;

      const latePhases: LatePhaseInfo[] = [];
      const upcomingCritical: UpcomingCriticalInfo[] = [];
      const budget: BudgetOverview = { planned: 0, actual: 0, variance: 0 };
      let pendingReceivingCount = 0;

      if (projectIds.length > 0) {

        const allActivities = withComputedDone(await loadActivities(projectIds, false));
        const activitiesByProject = new Map<string, typeof allActivities>();
        for (const activity of allActivities) {
          budget.planned += getPlannedAmount(activity);
          budget.actual += getActualAmount(activity);
          if (activity.requiresReceiving && !activity.done) pendingReceivingCount++;
          const list = activitiesByProject.get(activity.projectId) ?? [];
          list.push(activity);
          activitiesByProject.set(activity.projectId, list);
        }
        budget.variance = budget.planned - budget.actual;

        for (const [projectId, activities] of activitiesByProject) {
          const project = projectById.get(projectId);
          if (!project) continue;
          const schedule = computeSchedule(activities, customCalendars);

          for (const late of getLatePhases(activities, schedule)) {
            latePhases.push({ projectId, projectName: project.name, activityName: late.name, end: late.end });
          }
          for (const crit of getCriticalUpcoming(activities, schedule)) {
            upcomingCritical.push({
              projectId,
              projectName: project.name,
              activityName: crit.name,
              daysToStart: crit.daysToStart,
            });
          }
        }
      }

      latePhases.sort((a, b) => (a.end < b.end ? -1 : 1));
      upcomingCritical.sort((a, b) => a.daysToStart - b.daysToStart);

      const taskStatusCounts: Record<TaskStatus, number> = { todo: 0, in_progress: 0, done: 0 };
      let overdueTaskCount = 0;
      if (projectIds.length > 0) {
        const taskRows = await fetchRowsByIds(projectIds, (ids, from, to) => supabase.from("tasks").select("status, due_date")
          .in("project_id", ids).order("id").range(from, to));
        const today = todayISO();
        for (const t of taskRows) {
          taskStatusCounts[t.status]++;
          if (t.status !== "done" && t.due_date && t.due_date < today) overdueTaskCount++;
        }
      }

      return {
        projects,
        projectStatusCounts,
        taskStatusCounts,
        overdueTaskCount,
        latePhases,
        upcomingCritical,
        budget,
        pendingReceivingCount,
      };
    },
  });
}
