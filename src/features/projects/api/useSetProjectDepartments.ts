import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

/** يحدد أي قسم إدارة مشاريع وأي قسم مشتريات مسؤول عن هذا المشروع تحديداً — لمالك
 * الحساب/الإدارة التنفيذية فقط (يُفرَض من الدالة بغض النظر عمّن يستدعيها). */
export function useSetProjectDepartments(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      departmentId,
      procurementDepartmentId,
    }: {
      projectId: string;
      departmentId: string | null;
      procurementDepartmentId: string | null;
    }) => {
      const { error } = await supabase.rpc("set_project_departments", {
        p_project_id: projectId,
        p_department_id: departmentId,
        p_procurement_department_id: procurementDepartmentId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["projects", companyId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}
