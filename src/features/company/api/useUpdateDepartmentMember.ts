import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { MemberRole } from "@/types/domain";

export interface UpdateDepartmentMemberInput {
  id: string;
  departmentId?: string;
  role?: MemberRole;
  title?: string | null;
}

export function useUpdateDepartmentMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateDepartmentMemberInput) => {
      const patch: { department_id?: string; role?: MemberRole; title?: string | null } = {};
      if (input.departmentId) patch.department_id = input.departmentId;
      if (input.role) patch.role = input.role;
      if (input.title !== undefined) patch.title = input.title;
      const { error } = await supabase.from("department_members").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department_members"] });
    },
  });
}
