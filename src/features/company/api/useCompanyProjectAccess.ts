import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { ProjectMemberRole } from "@/types/domain";

export interface ProjectAccessRow {
  userId: string;
  fullName: string;
  role: ProjectMemberRole;
}

export interface ProjectAccess {
  projectId: string;
  projectName: string;
  members: ProjectAccessRow[];
}

export function useCompanyProjectAccess(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-project-access", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<ProjectAccess[]> => {
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, name")
        .eq("company_id", companyId!);
      if (projectsError) throw projectsError;
      if (projects.length === 0) return [];

      const projectIds = projects.map((p) => p.id);
      const { data: pmRows, error: pmError } = await supabase
        .from("project_members")
        .select("project_id, user_id, role")
        .in("project_id", projectIds);
      if (pmError) throw pmError;

      const userIds = [...new Set(pmRows.map((r) => r.user_id))];
      let nameById = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        if (profilesError) throw profilesError;
        nameById = new Map(profiles.map((p) => [p.id, p.full_name]));
      }

      const membersByProject = new Map<string, ProjectAccessRow[]>();
      for (const row of pmRows) {
        const list = membersByProject.get(row.project_id) ?? [];
        list.push({ userId: row.user_id, fullName: nameById.get(row.user_id) || "بدون اسم", role: row.role });
        membersByProject.set(row.project_id, list);
      }

      return projects.map((p) => ({
        projectId: p.id,
        projectName: p.name,
        members: membersByProject.get(p.id) ?? [],
      }));
    },
  });
}
