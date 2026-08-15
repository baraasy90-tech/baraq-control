import type { Database } from "@/lib/supabase/database.types";
import type { DocumentFolder, ProjectDocument } from "@/types/domain";

type FolderRow = Database["public"]["Tables"]["document_folders"]["Row"];
type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

export function mapFolder(row: FolderRow): DocumentFolder {
  return {
    id: row.id,
    projectId: row.project_id,
    parentFolderId: row.parent_folder_id,
    name: row.name,
  };
}

export function mapDocument(row: DocumentRow): ProjectDocument {
  return {
    id: row.id,
    folderId: row.folder_id,
    name: row.name,
    fileUrl: row.file_url,
    uploadedAt: row.uploaded_at,
  };
}
