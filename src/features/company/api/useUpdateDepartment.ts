import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export interface UpdateDepartmentInput {
  id: string;
  companyId: string;
  name?: string;
  headLabel?: string | null;
  memberLabel?: string | null;
  parentDepartmentId?: string | null;
  positionX?: number | null;
  positionY?: number | null;
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateDepartmentInput) => {
      const patch: {
        name?: string;
        head_label?: string | null;
        member_label?: string | null;
        parent_department_id?: string | null;
        position_x?: number | null;
        position_y?: number | null;
      } = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.headLabel !== undefined) patch.head_label = input.headLabel;
      if (input.memberLabel !== undefined) patch.member_label = input.memberLabel;
      if (input.parentDepartmentId !== undefined) patch.parent_department_id = input.parentDepartmentId;
      if (input.positionX !== undefined) patch.position_x = input.positionX;
      if (input.positionY !== undefined) patch.position_y = input.positionY;
      const { error } = await supabase.from("departments").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["departments", input.companyId] });
    },
  });
}
