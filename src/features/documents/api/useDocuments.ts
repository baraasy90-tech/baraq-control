import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapDocument } from "@/features/documents/api/mapDocument";

export function useDocuments(folderId: string | undefined) {
  return useQuery({
    queryKey: ["documents", folderId],
    enabled: !!folderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("folder_id", folderId!)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data.map(mapDocument);
    },
  });
}
