import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapProject } from "@/features/projects/api/mapProject";
import { getFileUrl } from "@/lib/supabase/storage";

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId!).single();
      if (error) throw error;
      const project = mapProject(data);
      project.managerSignatureUrl = await getFileUrl("signatures", data.manager_signature_url);
      return project;
    },
  });
}
