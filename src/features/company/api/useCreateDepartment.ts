import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { DepartmentType } from "@/types/domain";

export interface CreateDepartmentInput {
  companyId: string;
  name: string;
  type: DepartmentType;
  parentDepartmentId?: string | null;
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDepartmentInput) => {
      const { error } = await supabase.from("departments").insert({
        company_id: input.companyId,
        name: input.name,
        type: input.type,
        parent_department_id: input.parentDepartmentId || null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["departments", input.companyId] });
    },
  });
}
