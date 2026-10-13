import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { fetchAllRows, fetchRowsByIds } from "@/lib/supabase/fetchAllRows";
import { mapTask } from "@/features/tasks/api/mapTask";
import type { Task } from "@/types/domain";

export interface TaskWithContext extends Task {
  projectName: string;
  projectThemeColor: string;
  assigneeName: string | null;
}

export function useCompanyTasks(companyId: string | undefined) {
  return useQuery({
    queryKey: ["tasks", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<TaskWithContext[]> => {
      const projects = await fetchAllRows((from, to) => supabase
        .from("projects")
        .select("id, name, theme_color")
        .eq("company_id", companyId!).order("id").range(from, to));
      if (projects.length === 0) return [];

      const projectIds = projects.map((p) => p.id);
      const taskRows = await fetchRowsByIds(projectIds, (ids, from, to) => supabase
        .from("tasks")
        .select("*")
        .in("project_id", ids)
        .order("created_at", { ascending: false }).order("id").range(from, to));
      taskRows.sort((a,b)=>b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id));
      if (taskRows.length === 0) return [];

      const assigneeIds = [...new Set(taskRows.map((t) => t.assigned_to).filter((id): id is string => !!id))];
      let nameById = new Map<string, string>();
      if (assigneeIds.length > 0) {
        const profiles = await fetchRowsByIds(assigneeIds, (ids, from, to) => supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids).order("id").range(from, to));
        nameById = new Map(profiles.map((p) => [p.id, p.full_name]));
      }

      const projectById = new Map(projects.map((p) => [p.id, p]));

      return taskRows.map((row) => {
        const task = mapTask(row);
        const project = projectById.get(task.projectId);
        return {
          ...task,
          projectName: project?.name ?? "—",
          projectThemeColor: project?.theme_color ?? "#5B6472",
          assigneeName: task.assignedTo ? (nameById.get(task.assignedTo) ?? "بدون اسم") : null,
        };
      });
    },
  });
}
