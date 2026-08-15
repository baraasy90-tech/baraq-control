import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Department } from "@/types/domain";

export function useDepartments(companyId: string | undefined) {
  return useQuery({
    queryKey: ["departments", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<Department[]> => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, company_id, name, type, head_label, member_label, parent_department_id, position_x, position_y")
        .eq("company_id", companyId!)
        .order("type");
      if (error) throw error;
      return data.map((d) => ({
        id: d.id,
        companyId: d.company_id,
        name: d.name,
        type: d.type,
        headLabel: d.head_label,
        memberLabel: d.member_label,
        parentDepartmentId: d.parent_department_id,
        positionX: d.position_x,
        positionY: d.position_y,
      }));
    },
  });
}
