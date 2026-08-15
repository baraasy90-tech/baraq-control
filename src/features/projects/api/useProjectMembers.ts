import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { ProjectMember } from "@/types/domain";

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project_members", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectMember[]> => {
      const { data: members, error } = await supabase
        .from("project_members")
        .select("id, project_id, user_id, role")
        .eq("project_id", projectId!);
      if (error) throw error;
      if (members.length === 0) return [];

      const userIds = [...new Set(members.map((m) => m.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      if (profilesError) throw profilesError;

      const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));
      return members.map((m) => ({
        id: m.id,
        projectId: m.project_id,
        userId: m.user_id,
        role: m.role,
        fullName: nameById.get(m.user_id) || "بدون اسم",
      }));
    },
  });
}
