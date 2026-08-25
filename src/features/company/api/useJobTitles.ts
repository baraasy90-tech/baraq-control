import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { JobTitle } from "@/types/domain";

export function useJobTitles(companyId: string | undefined) {
  return useQuery({
    queryKey: ["job_titles", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<JobTitle[]> => {
      const { data, error } = await supabase
        .from("job_titles")
        .select("id, company_id, name")
        .eq("company_id", companyId!)
        .order("name");
      if (error) throw error;
      return data.map((j) => ({ id: j.id, companyId: j.company_id, name: j.name }));
    },
  });
}

export interface SaveJobTitleInput {
  id?: string;
  companyId: string;
  name: string;
}

export function useSaveJobTitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveJobTitleInput) => {
      const row = { company_id: input.companyId, name: input.name };
      const { error } = input.id
        ? await supabase.from("job_titles").update(row).eq("id", input.id)
        : await supabase.from("job_titles").insert(row);
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["job_titles", input.companyId] });
    },
  });
}

export function useDeleteJobTitle(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_titles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_titles", companyId] });
    },
  });
}
