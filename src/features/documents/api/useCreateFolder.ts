import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapFolder } from "@/features/documents/api/mapDocument";

export function useCreateFolder(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, parentFolderId }: { name: string; parentFolderId: string | null }) => {
      const { data, error } = await supabase
        .from("document_folders")
        .insert({ project_id: projectId!, name, parent_folder_id: parentFolderId })
        .select()
        .single();
      if (error) throw error;
      return mapFolder(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-folders", projectId] });
    },
  });
}
