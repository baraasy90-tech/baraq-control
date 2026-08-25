import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { OrganizationalClassification } from "@/types/domain";

export function useOrganizationalClassifications(companyId: string | undefined) {
  return useQuery({
    queryKey: ["organizational_classifications", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<OrganizationalClassification[]> => {
      const { data, error } = await supabase
        .from("organizational_classifications")
        .select("id, company_id, name, description")
        .eq("company_id", companyId!)
        .order("name");
      if (error) throw error;
      return data.map((c) => ({
        id: c.id,
        companyId: c.company_id,
        name: c.name,
        description: c.description,
      }));
    },
  });
}

export interface SaveOrganizationalClassificationInput {
  id?: string;
  companyId: string;
  name: string;
  description: string | null;
}

export function useSaveOrganizationalClassification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveOrganizationalClassificationInput) => {
      const row = { company_id: input.companyId, name: input.name, description: input.description };
      const { error } = input.id
        ? await supabase.from("organizational_classifications").update(row).eq("id", input.id)
        : await supabase.from("organizational_classifications").insert(row);
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["organizational_classifications", input.companyId] });
    },
  });
}

export function useDeleteOrganizationalClassification(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("organizational_classifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizational_classifications", companyId] });
    },
  });
}
