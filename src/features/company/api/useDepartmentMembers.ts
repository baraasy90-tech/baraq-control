import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { fetchRowsByIds } from "@/lib/supabase/fetchAllRows";
import type { DepartmentMember } from "@/types/domain";

export function useDepartmentMembers(departmentIds: string[]) {
  const key = [...departmentIds].sort().join(",");

  return useQuery({
    queryKey: ["department_members", key],
    enabled: departmentIds.length > 0,
    queryFn: async (): Promise<DepartmentMember[]> => {
      const members = await fetchRowsByIds(departmentIds, (ids, from, to) => supabase
        .from("department_members")
        .select(
          "id, department_id, user_id, role, title, organizational_level_id, organizational_classification_id, job_title_id, employee_id"
        )
        .in("department_id", ids).order("id").range(from, to));
      if (members.length === 0) return [];

      const userIds = [...new Set(members.map((m) => m.user_id))];
      const profiles = await fetchRowsByIds(userIds, (ids, from, to) => supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids).order("id").range(from, to));

      const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));
      return members.map((m) => ({
        id: m.id,
        departmentId: m.department_id,
        userId: m.user_id,
        role: m.role,
        fullName: nameById.get(m.user_id) || "بدون اسم",
        title: m.title,
        organizationalLevelId: m.organizational_level_id,
        organizationalClassificationId: m.organizational_classification_id,
        jobTitleId: m.job_title_id,
        employeeId: m.employee_id,
      }));
    },
  });
}
