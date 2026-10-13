import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapDocument } from "@/features/documents/api/mapDocument";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";

export function useDocuments(folderId: string | undefined) {
  return useQuery({
    queryKey: ["documents", folderId],
    enabled: !!folderId,
    queryFn: async () => {
      const data = await fetchAllRows((from, to) => supabase
        .from("documents")
        .select("*")
        .eq("folder_id", folderId!)
        .order("uploaded_at", { ascending: false }).order("id").range(from, to));
      return data.map(mapDocument);
    },
  });
}
