import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapDocument } from "@/features/documents/api/mapDocument";
import { getFileUrls } from "@/lib/supabase/storage";

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
      const urlByStored = await getFileUrls("documents", data.map((row) => row.file_url));
      return data.map((row) => {
        const doc = mapDocument(row);
        doc.fileUrl = urlByStored.get(row.file_url) ?? row.file_url;
        return doc;
      });
    },
  });
}
