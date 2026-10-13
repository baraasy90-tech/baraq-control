import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapProject } from "@/features/projects/api/mapProject";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import { getFileUrls } from "@/lib/supabase/storage";

export function useProjects(companyId: string | undefined) {
  return useQuery({
    queryKey: ["projects", companyId],
    enabled: !!companyId,
    refetchInterval: 8 * 60 * 1000,
    queryFn: async () => {
      const data = await fetchAllRows((from, to) => supabase
        .from("projects")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: true }).order("id").range(from, to));
      const signatures = await getFileUrls("signatures", data.map(row => row.manager_signature_url));
      return data.map(row => ({ ...mapProject(row), managerSignatureUrl: row.manager_signature_url ? signatures.get(row.manager_signature_url) ?? null : null }));
    },
  });
}
