import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { ProjectMemberRole } from "@/types/domain";

export interface AddProjectMemberInput {
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
}

export function useAddProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddProjectMemberInput) => {
      const { error } = await supabase
        .from("project_members")
        .upsert(
          { project_id: input.projectId, user_id: input.userId, role: input.role },
          { onConflict: "project_id,user_id" }
        );
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["project_members", input.projectId] });
    },
  });
}
