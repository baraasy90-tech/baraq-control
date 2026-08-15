import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapFolder } from "@/features/documents/api/mapDocument";

export function useDocumentFolders(projectId: string | undefined) {
  return useQuery({
    queryKey: ["document-folders", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_folders")
        .select("*")
        .eq("project_id", projectId!)
        .order("name", { ascending: true });
      if (error) throw error;
      return data.map(mapFolder);
    },
  });
}
