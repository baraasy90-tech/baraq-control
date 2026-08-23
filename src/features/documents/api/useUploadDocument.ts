import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { uploadFile, uniqueFileName, getFileUrl } from "@/lib/supabase/storage";
import { useAuth } from "@/features/auth/AuthContext";
import { mapDocument } from "@/features/documents/api/mapDocument";

export function useUploadDocument(folderId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("not authenticated");
      const path = await uploadFile("documents", `${user.id}/${uniqueFileName(file.name)}`, file);
      const { data, error } = await supabase
        .from("documents")
        .insert({ folder_id: folderId!, name: file.name, file_url: path })
        .select()
        .single();
      if (error) throw error;
      const doc = mapDocument(data);
      doc.fileUrl = (await getFileUrl("documents", data.file_url)) ?? data.file_url;
      return doc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", folderId] });
    },
  });
}
