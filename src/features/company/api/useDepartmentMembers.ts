import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { DepartmentMember } from "@/types/domain";

export function useDepartmentMembers(departmentIds: string[]) {
  const key = [...departmentIds].sort().join(",");

  return useQuery({
    queryKey: ["department_members", key],
    enabled: departmentIds.length > 0,
    queryFn: async (): Promise<DepartmentMember[]> => {
      const { data: members, error } = await supabase
        .from("department_members")
        .select("id, department_id, user_id, role, title")
        .in("department_id", departmentIds);
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
        departmentId: m.department_id,
        userId: m.user_id,
        role: m.role,
        fullName: nameById.get(m.user_id) || "بدون اسم",
        title: m.title,
      }));
    },
  });
}
