import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export function useDeleteDepartment(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("departments").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("لا تملك صلاحية حذف هذا القسم");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", companyId] });
    },
  });
}
