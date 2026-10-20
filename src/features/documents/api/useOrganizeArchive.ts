import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { DocumentFolder, ProjectDocument } from "@/types/domain";
import { cleanDocumentMetadata, type DocumentMetadata } from "../documentMetadata";
import { archiveNameError } from "../archiveNames";

export function useOrganizeArchive(projectId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async (change: { kind: "folder"; folder: DocumentFolder; name: string } | { kind: "document"; document: ProjectDocument; name: string; folderId: string; metadata:DocumentMetadata }) => {
      const name = change.name.trim(), validation = archiveNameError(name);
      if (validation) throw new Error(validation);
      if (change.kind === "folder") {
        const { error } = await supabase.from("document_folders").update({ name }).is("trashed_at",null).eq("id", change.folder.id)
          .eq("project_id", projectId).eq("name", change.folder.name).select("id").single();
        if (error) throw error;
      } else {
        const ids = [...new Set([change.document.folderId, change.folderId])];
        const folders = await supabase.from("document_folders").select("id").eq("project_id", projectId).is("trashed_at",null).in("id", ids);
        if (folders.error) throw folders.error;
        if (folders.data.length !== ids.length) throw new Error("المجلد المصدر أو الوجهة غير متاح ضمن هذا المشروع. حدّث القائمة وحاول مجدداً.");
        const metadata=cleanDocumentMetadata(change.metadata);
        const { error } = await supabase.from("documents").update({ name, folder_id: change.folderId, category:metadata.category,reference_number:metadata.referenceNumber,document_date:metadata.documentDate,description:metadata.description })
          .is("trashed_at",null).eq("row_version",change.document.rowVersion??0).eq("id", change.document.id).eq("folder_id", change.document.folderId).eq("name", change.document.name).select("id").single();
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["document-folders", projectId] }),
        cache.invalidateQueries({ queryKey: ["documents"] }),
        cache.invalidateQueries({ queryKey: ["project-document-index", projectId] }),
      ]);
    },
  });
}
