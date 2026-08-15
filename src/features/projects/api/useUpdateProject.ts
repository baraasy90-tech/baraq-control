import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapProject } from "@/features/projects/api/mapProject";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { ProjectStatus, ScopeConfig } from "@/types/domain";

type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export interface UpdateProjectInput {
  id: string;
  companyId: string;
  name?: string;
  managerName?: string;
  location?: string;
  mapLink?: string;
  area?: string;
  unitsCount?: string;
  projectType?: string;
  managerSignatureUrl?: string | null;
  themeColor?: string;
  themeIcon?: string;
  scopeConfig?: ScopeConfig | null;
  status?: ProjectStatus;
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProjectInput) => {
      const patch: ProjectUpdate = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.managerName !== undefined) patch.manager_name = input.managerName;
      if (input.location !== undefined) patch.location = input.location;
      if (input.mapLink !== undefined) patch.map_link = input.mapLink;
      if (input.area !== undefined) patch.area = input.area;
      if (input.unitsCount !== undefined) patch.units_count = input.unitsCount;
      if (input.projectType !== undefined) patch.project_type = input.projectType;
      if (input.managerSignatureUrl !== undefined) patch.manager_signature_url = input.managerSignatureUrl;
      if (input.themeColor !== undefined) patch.theme_color = input.themeColor;
      if (input.themeIcon !== undefined) patch.theme_icon = input.themeIcon;
      if (input.scopeConfig !== undefined) patch.scope_config = input.scopeConfig as unknown as Json;
      if (input.status !== undefined) patch.status = input.status;

      const { data, error } = await supabase.from("projects").update(patch).eq("id", input.id).select().single();
      if (error) throw error;
      return mapProject(data);
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects", project.companyId] });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
    },
  });
}
