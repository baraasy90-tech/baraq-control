import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapProject } from "@/features/projects/api/mapProject";

export interface CreateProjectInput {
  companyId: string;
  name: string;
  managerName: string;
  location: string;
  mapLink: string;
  area: string;
  unitsCount: string;
  projectType: string;
  managerSignatureUrl: string | null;
  themeColor: string;
  themeIcon: string;
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          company_id: input.companyId,
          name: input.name,
          manager_name: input.managerName,
          location: input.location,
          map_link: input.mapLink,
          area: input.area,
          units_count: input.unitsCount,
          project_type: input.projectType,
          manager_signature_url: input.managerSignatureUrl,
          theme_color: input.themeColor,
          theme_icon: input.themeIcon,
        })
        .select()
        .single();
      if (error) throw error;
      return mapProject(data);
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects", project.companyId] });
    },
  });
}
