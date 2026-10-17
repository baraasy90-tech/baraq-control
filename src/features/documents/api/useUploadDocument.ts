import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { uploadFile, uniqueFileName } from "@/lib/supabase/storage";
import { useAuth } from "@/features/auth/AuthContext";
import { mapDocument } from "@/features/documents/api/mapDocument";
import { isDefinitiveDatabaseRejection } from "@/lib/supabase/writeErrors";

export function useUploadDocument(folderId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user || !folderId) throw new Error("يلزم تسجيل الدخول واختيار مجلد");
      const path = await uploadFile("documents", `${user.id}/${uniqueFileName(file.name)}`, file);
      const { data, error } = await supabase
        .from("documents")
        .insert({ folder_id: folderId!, name: file.name, file_url: path })
        .select()
        .single();
      if (error) {
        if (isDefinitiveDatabaseRejection(error.code)) await supabase.storage.from("documents").remove([path]);
        throw error;
      }
      return mapDocument(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", folderId] });
      queryClient.invalidateQueries({ queryKey: ["project-document-index"] });
    },
  });
}
