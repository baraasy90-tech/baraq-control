import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
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
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, name, theme_color")
        .eq("company_id", companyId!);
      if (projectsError) throw projectsError;
      if (projects.length === 0) return [];

      const projectIds = projects.map((p) => p.id);
      const { data: taskRows, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false });
      if (tasksError) throw tasksError;
      if (taskRows.length === 0) return [];

      const assigneeIds = [...new Set(taskRows.map((t) => t.assigned_to).filter((id): id is string => !!id))];
      let nameById = new Map<string, string>();
      if (assigneeIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", assigneeIds);
        if (profilesError) throw profilesError;
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
