import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { fetchRowsByIds } from "@/lib/supabase/fetchAllRows";
import { mapDocument } from "./mapDocument";

/** Names and paths only; file contents are never downloaded for this search. RLS still applies. */
export function useProjectDocumentIndex(projectId: string, folderIds: string[], enabled: boolean) {
  const ids = [...folderIds].sort();
  return useQuery({
    queryKey: ["project-document-index", projectId, ids],
    enabled,
    queryFn: async () => {
      const rows = await fetchRowsByIds(ids, (batch, from, to) => supabase.from("documents").select("*")
        .in("folder_id", batch).order("id").range(from, to));
      return rows.map(mapDocument);
    },
  });
}
