import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapActivity } from "@/features/schedule/api/mapActivity";
import { computeSchedule, getCurrentPreviousNext, getCriticalUpcoming } from "@/features/schedule/lib/schedule";
import type { Activity } from "@/types/domain";

export interface PhaseRef {
  projectId: string;
  projectName: string;
  name: string;
}

export interface CriticalPhaseRef extends PhaseRef {
  daysToStart: number;
}

export interface MemberWorkSummary {
  completionPct: number;
  currentPhases: PhaseRef[];
  previousPhase: (PhaseRef & { end: string }) | null;
  criticalPhases: CriticalPhaseRef[];
}

export function useMemberWorkSummaries(userIds: string[]) {
  const key = [...userIds].sort().join(",");

  return useQuery({
    queryKey: ["member-work", key],
    enabled: userIds.length > 0,
    queryFn: async (): Promise<Map<string, MemberWorkSummary>> => {
      const { data: pmRows, error: pmError } = await supabase
        .from("project_members")
        .select("project_id, user_id")
        .in("user_id", userIds);
      if (pmError) throw pmError;
      if (pmRows.length === 0) return new Map();

      const projectIds = [...new Set(pmRows.map((r) => r.project_id))];
      const { data: projectRows, error: projError } = await supabase
        .from("projects")
        .select("id, name, company_id")
        .in("id", projectIds);
      if (projError) throw projError;
      const projectNameById = new Map(projectRows.map((p) => [p.id, p.name]));

      const companyIds = [...new Set(projectRows.map((p) => p.company_id))];
      const { data: calendarRows, error: calendarsError } =
        companyIds.length > 0
          ? await supabase.from("custom_calendars").select("id, working_weekdays").in("company_id", companyIds)
          : { data: [] as { id: string; working_weekdays: number[] }[], error: null };
      if (calendarsError) throw calendarsError;
      const customCalendars = new Map(calendarRows.map((c) => [c.id, c.working_weekdays]));

      const { data: activityRows, error: actError } = await supabase
        .from("activities")
        .select("*")
        .in("project_id", projectIds)
        .order("order", { ascending: true });
      if (actError) throw actError;

      const activitiesByProject = new Map<string, Activity[]>();
      for (const row of activityRows) {
        const activity = mapActivity(row);
        const list = activitiesByProject.get(activity.projectId) ?? [];
        list.push(activity);
        activitiesByProject.set(activity.projectId, list);
      }

      const scheduleByProject = new Map<string, ReturnType<typeof computeSchedule>>();
      for (const [pid, acts] of activitiesByProject) scheduleByProject.set(pid, computeSchedule(acts, customCalendars));

      const projectIdsByUser = new Map<string, string[]>();
      for (const r of pmRows) {
        const list = projectIdsByUser.get(r.user_id) ?? [];
        list.push(r.project_id);
        projectIdsByUser.set(r.user_id, list);
      }

      const result = new Map<string, MemberWorkSummary>();
      for (const userId of userIds) {
        const projIds = projectIdsByUser.get(userId) ?? [];
        let totalRoots = 0;
        let doneRoots = 0;
        const currentPhases: PhaseRef[] = [];
        let previousPhase: (PhaseRef & { end: string }) | null = null;
        const criticalPhases: CriticalPhaseRef[] = [];

        for (const pid of projIds) {
          const acts = activitiesByProject.get(pid) ?? [];
          const schedule = scheduleByProject.get(pid);
          if (!schedule) continue;
          const projectName = projectNameById.get(pid) ?? "—";
          const roots = acts.filter((a) => a.parentId === null);
          totalRoots += roots.length;
          doneRoots += roots.filter((a) => a.done).length;

          const cpn = getCurrentPreviousNext(acts, schedule);
          if (cpn.current) currentPhases.push({ projectId: pid, projectName, name: cpn.current.name });
          if (cpn.previous) {
            const end = schedule[cpn.previous.id]?.end ?? "";
            if (!previousPhase || end > previousPhase.end) {
              previousPhase = { projectId: pid, projectName, name: cpn.previous.name, end };
            }
          }
          for (const c of getCriticalUpcoming(acts, schedule)) {
            criticalPhases.push({ projectId: pid, projectName, name: c.name, daysToStart: c.daysToStart });
          }
        }

        criticalPhases.sort((a, b) => a.daysToStart - b.daysToStart);
        result.set(userId, {
          completionPct: totalRoots > 0 ? Math.round((doneRoots / totalRoots) * 100) : 0,
          currentPhases,
          previousPhase,
          criticalPhases,
        });
      }

      return result;
    },
  });
}
