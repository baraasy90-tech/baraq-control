import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { fetchRowsByIds } from "@/lib/supabase/fetchAllRows";
import { getFileUrls } from "@/lib/supabase/storage";

export interface MiniProfile {
  id: string;
  fullName: string;
  signatureUrl: string | null;
}

export function useProfilesByIds(userIds: (string | null | undefined)[]) {
  const ids = [...new Set(userIds.filter((id): id is string => !!id))].sort();

  return useQuery({
    queryKey: ["profiles-by-ids", ids],
    enabled: ids.length > 0,
    queryFn: async (): Promise<Map<string, MiniProfile>> => {
      const data = await fetchRowsByIds(ids, (batch, from, to) => supabase.from("profiles").select("id, full_name, signature_url").in("id", batch).order("id").range(from, to));
      const urlByStored = await getFileUrls("signatures", data.map((row) => row.signature_url));
      const map = new Map<string, MiniProfile>();
      for (const row of data) {
        map.set(row.id, {
          id: row.id,
          fullName: row.full_name,
          signatureUrl: row.signature_url ? urlByStored.get(row.signature_url) ?? null : null,
        });
      }
      return map;
    },
  });
}
