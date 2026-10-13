import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import { mapFolder } from "@/features/documents/api/mapDocument";

export function useDocumentFolders(projectId: string | undefined) {
  return useQuery({
    queryKey: ["document-folders", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const data = await fetchAllRows((from, to) => supabase
        .from("document_folders")
        .select("*")
        .eq("project_id", projectId!)
        .order("name", { ascending: true }).order("id").range(from, to));
      return data.map(mapFolder);
    },
  });
}
