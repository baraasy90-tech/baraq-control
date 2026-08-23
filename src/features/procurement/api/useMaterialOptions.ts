import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import type { MaterialRequestOption } from "@/types/domain";

function mapOption(row: {
  id: string;
  material_request_id: string;
  description: string;
  price: number | null;
  created_by: string | null;
  created_at: string;
}): MaterialRequestOption {
  return {
    id: row.id,
    materialRequestId: row.material_request_id,
    description: row.description,
    price: row.price,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function useMaterialOptions(requestId: string | undefined) {
  return useQuery({
    queryKey: ["material_request_options", requestId],
    enabled: !!requestId,
    queryFn: async (): Promise<MaterialRequestOption[]> => {
      const { data, error } = await supabase
        .from("material_request_options")
        .select("*")
        .eq("material_request_id", requestId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data.map(mapOption);
    },
  });
}

export function useAddMaterialOption(requestId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ description, price }: { description: string; price: number | null }) => {
      if (!user || !requestId) throw new Error("not authenticated");
      const { data, error } = await supabase
        .from("material_request_options")
        .insert({ material_request_id: requestId, description, price, created_by: user.id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material_request_options", requestId] });
    },
  });
}

export function useDeleteMaterialOption(requestId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (optionId: string) => {
      const { error } = await supabase.from("material_request_options").delete().eq("id", optionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material_request_options", requestId] });
      queryClient.invalidateQueries({ queryKey: ["material_request_attachments", requestId] });
    },
  });
}
