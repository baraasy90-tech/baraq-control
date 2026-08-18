import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapMaterialRequest } from "@/features/procurement/api/mapMaterialRequest";
import type { MaterialRequest } from "@/types/domain";

/** كل طلبات المواد/المشتريات لمشروع معيّن (عينات وشراء رسمي). */
export function useMaterialRequests(projectId: string | undefined) {
  return useQuery({
    queryKey: ["material_requests", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<MaterialRequest[]> => {
      const { data, error } = await supabase
        .from("material_requests")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(mapMaterialRequest);
    },
  });
}

export function useMaterialRequest(requestId: string | undefined) {
  return useQuery({
    queryKey: ["material_request", requestId],
    enabled: !!requestId,
    queryFn: async (): Promise<MaterialRequest | null> => {
      const { data, error } = await supabase.from("material_requests").select("*").eq("id", requestId!).maybeSingle();
      if (error) throw error;
      return data ? mapMaterialRequest(data) : null;
    },
  });
}
