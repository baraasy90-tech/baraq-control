import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { OrganizationalLevel } from "@/types/domain";

export function useOrganizationalLevels(companyId: string | undefined) {
  return useQuery({
    queryKey: ["organizational_levels", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<OrganizationalLevel[]> => {
      const { data, error } = await supabase
        .from("organizational_levels")
        .select("id, company_id, name, order_index, is_management_level, is_employee_level, is_worker_level")
        .eq("company_id", companyId!)
        .order("order_index");
      if (error) throw error;
      return data.map((l) => ({
        id: l.id,
        companyId: l.company_id,
        name: l.name,
        orderIndex: l.order_index,
        isManagementLevel: l.is_management_level,
        isEmployeeLevel: l.is_employee_level,
        isWorkerLevel: l.is_worker_level,
      }));
    },
  });
}

export interface SaveOrganizationalLevelInput {
  id?: string;
  companyId: string;
  name: string;
  orderIndex: number;
  isManagementLevel: boolean;
  isEmployeeLevel: boolean;
  isWorkerLevel: boolean;
}

export function useSaveOrganizationalLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveOrganizationalLevelInput) => {
      const row = {
        company_id: input.companyId,
        name: input.name,
        order_index: input.orderIndex,
        is_management_level: input.isManagementLevel,
        is_employee_level: input.isEmployeeLevel,
        is_worker_level: input.isWorkerLevel,
      };
      const { error } = input.id
        ? await supabase.from("organizational_levels").update(row).eq("id", input.id)
        : await supabase.from("organizational_levels").insert(row);
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["organizational_levels", input.companyId] });
    },
  });
}

export function useDeleteOrganizationalLevel(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("organizational_levels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizational_levels", companyId] });
    },
  });
}
