import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapActivity } from "@/features/schedule/api/mapActivity";
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

      const { data: projectRows, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("company_id", companyId!);
      if (projectsError) throw projectsError;
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
        const { data: activityRows, error: activitiesError } = await supabase
          .from("activities")
          .select("*")
          .in("project_id", projectIds)
          .order("order", { ascending: true });
        if (activitiesError) throw activitiesError;

        const activityIds = activityRows.map((a) => a.id);
        const { data: budgetRows, error: budgetError } =
          activityIds.length > 0
            ? await supabase
                .from("budget_actual_entries")
                .select("activity_id, amount")
                .in("activity_id", activityIds)
                .eq("status", "approved")
            : { data: [] as { activity_id: string; amount: number }[], error: null };
        if (budgetError) throw budgetError;

        const actualByActivity = new Map<string, number>();
        for (const row of budgetRows) {
          actualByActivity.set(row.activity_id, (actualByActivity.get(row.activity_id) ?? 0) + row.amount);
        }

        const activitiesByProject = new Map<string, ReturnType<typeof mapActivity>[]>();
        for (const row of activityRows) {
          const activity = mapActivity(row);
          activity.actualEntries = actualByActivity.has(row.id)
            ? [
                {
                  id: "",
                  activityId: row.id,
                  date: "",
                  amount: actualByActivity.get(row.id)!,
                  source: "",
                  note: null,
                  contractRef: null,
                  contractPaymentId: null,
                  status: "approved",
                  submittedAt: null,
                  pmReviewedAt: null,
                  pmReviewNote: null,
                  financeReviewedAt: null,
                  financeReviewNote: null,
                },
              ]
            : [];
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
        const { data: taskRows, error: tasksError } = await supabase
          .from("tasks")
          .select("status, due_date")
          .in("project_id", projectIds);
        if (tasksError) throw tasksError;
        const today = new Date().toISOString().slice(0, 10);
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
