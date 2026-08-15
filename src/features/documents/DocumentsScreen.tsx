import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Folder, FileText, Trash2 } from "lucide-react";
import { SecondaryButton, PrimaryButton, IconButton, Modal, ErrorText, TextInput, FieldLabel } from "@/components/ui";
import { useDocumentFolders } from "@/features/documents/api/useDocumentFolders";
import { useDocuments } from "@/features/documents/api/useDocuments";
import { useCreateFolder } from "@/features/documents/api/useCreateFolder";
import { useDeleteFolder } from "@/features/documents/api/useDeleteFolder";
import { useUploadDocument } from "@/features/documents/api/useUploadDocument";
import { useDeleteDocument } from "@/features/documents/api/useDeleteDocument";
import type { DocumentFolder, Project } from "@/types/domain";

export function DocumentsScreen({ project }: { project: Project }) {
  const navigate = useNavigate();
  const foldersQuery = useDocumentFolders(project.id);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const documentsQuery = useDocuments(currentFolderId ?? undefined);
  const createFolder = useCreateFolder(project.id);
  const deleteFolder = useDeleteFolder(project.id);
  const uploadDocument = useUploadDocument(currentFolderId ?? undefined);
  const deleteDocument = useDeleteDocument(currentFolderId ?? undefined);

  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<DocumentFolder | null>(null);
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const folders = foldersQuery.data ?? [];
  const documents = documentsQuery.data ?? [];
  const subfolders = folders.filter((f) => f.parentFolderId === currentFolderId);

  const buildBreadcrumb = (): DocumentFolder[] => {
    const path: DocumentFolder[] = [];
    let cursor = folders.find((f) => f.id === currentFolderId) ?? null;
    while (cursor) {
      path.unshift(cursor);
      cursor = folders.find((f) => f.id === cursor!.parentFolderId) ?? null;
    }
    return path;
  };
  const breadcrumb = buildBreadcrumb();

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setError("");
    try {
      await createFolder.mutateAsync({ name: newFolderName.trim(), parentFolderId: currentFolderId });
      setNewFolderName("");
      setFolderModalOpen(false);
    } catch {
      setError("تعذّر إنشاء المجلد، حاول مجدداً");
    }
  };

  const handleDeleteFolder = async (folder: DocumentFolder) => {
    try {
      await deleteFolder.mutateAsync(folder.id);
      if (currentFolderId === folder.id) setCurrentFolderId(folder.parentFolderId);
    } finally {
      setConfirmDeleteFolder(null);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !currentFolderId) return;
    setError("");
    setUploading(true);
    try {
      await uploadDocument.mutateAsync(file);
    } catch {
      setError("تعذّر رفع الملف، حاول مجدداً");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await deleteDocument.mutateAsync(id);
    } finally {
      setConfirmDeleteDocId(null);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-ink truncate">المستندات — {project.name}</h1>
        <SecondaryButton onClick={() => navigate(`/projects/${project.id}`)}>رجوع</SecondaryButton>
      </div>

      <div className="flex items-center flex-wrap gap-1 text-sm mb-4">
        <button
          onClick={() => setCurrentFolderId(null)}
          className={`cursor-pointer bg-transparent border-none ${currentFolderId === null ? "font-bold text-ink" : "text-primary"}`}
        >
          📁 الرئيسية
        </button>
        {breadcrumb.map((f) => (
          <span key={f.id} className="flex items-center gap-1">
            <span className="text-ink-soft">/</span>
            <button
              onClick={() => setCurrentFolderId(f.id)}
              className={`cursor-pointer bg-transparent border-none ${f.id === currentFolderId ? "font-bold text-ink" : "text-primary"}`}
            >
              {f.name}
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2 mb-5">
        <SecondaryButton onClick={() => setFolderModalOpen(true)} className="text-sm">
          + مجلد جديد
        </SecondaryButton>
        <label
          className={`text-sm px-4 py-2.5 rounded-lg border font-semibold cursor-pointer ${
            currentFolderId ? "border-primary text-primary bg-primary-bg" : "border-line text-ink-soft bg-bg cursor-not-allowed"
          }`}
        >
          {uploading ? "جارٍ الرفع..." : "+ رفع ملف"}
          <input type="file" onChange={handleUpload} disabled={!currentFolderId || uploading} className="hidden" />
        </label>
      </div>
      {!currentFolderId && (
        <p className="text-xs text-ink-soft mb-4">افتح مجلداً أولاً لرفع الملفات داخله (لا يمكن رفع ملفات بالجذر مباشرة)</p>
      )}

      <ErrorText>{error}</ErrorText>

      {(foldersQuery.isLoading || (currentFolderId && documentsQuery.isLoading)) && (
        <p className="text-sm text-ink-soft">جارٍ التحميل...</p>
      )}

      {subfolders.length === 0 && documents.length === 0 && !foldersQuery.isLoading ? (
        <div className="bg-panel border border-dashed border-line rounded-xl p-10 text-center text-sm text-ink-soft">
          هذا المجلد فارغ
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {subfolders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center justify-between gap-2 bg-panel border border-line/60 shadow-sm rounded-lg px-4 py-3"
            >
              <button
                onClick={() => setCurrentFolderId(folder.id)}
                className="flex-1 text-right flex items-center gap-2 cursor-pointer bg-transparent border-none"
              >
                <Folder size={18} className="text-primary shrink-0" strokeWidth={2} />
                <span className="text-sm font-semibold text-ink">{folder.name}</span>
              </button>
              <IconButton icon={Trash2} label="حذف" tone="critical" onClick={() => setConfirmDeleteFolder(folder)} />
            </div>
          ))}

          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-2 bg-panel border border-line/60 shadow-sm rounded-lg px-4 py-3"
            >
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 flex items-center gap-2 text-ink no-underline"
              >
                <FileText size={18} className="text-ink-soft shrink-0" strokeWidth={2} />
                <span className="text-sm font-medium truncate">{doc.name}</span>
                <span className="text-xs text-ink-soft shrink-0">
                  {new Date(doc.uploadedAt).toLocaleDateString("ar-SA")}
                </span>
              </a>
              <IconButton icon={Trash2} label="حذف" tone="critical" onClick={() => setConfirmDeleteDocId(doc.id)} />
            </div>
          ))}
        </div>
      )}

      {folderModalOpen && (
        <Modal title="مجلد جديد" onClose={() => setFolderModalOpen(false)}>
          <FieldLabel>اسم المجلد</FieldLabel>
          <TextInput value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} />
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2 mt-4">
            <SecondaryButton onClick={() => setFolderModalOpen(false)} className="flex-1">
              إلغاء
            </SecondaryButton>
            <PrimaryButton onClick={handleCreateFolder} disabled={!newFolderName.trim() || createFolder.isPending} className="flex-1">
              {createFolder.isPending ? "جارٍ الإنشاء..." : "إنشاء"}
            </PrimaryButton>
          </div>
        </Modal>
      )}

      {confirmDeleteFolder && (
        <Modal title="تأكيد الحذف" onClose={() => setConfirmDeleteFolder(null)}>
          <p className="text-sm text-ink-soft mb-5">
            هل أنت متأكد من حذف مجلد "{confirmDeleteFolder.name}"؟ سيتم حذف كل ما بداخله من مجلدات وملفات فرعية بشكل نهائي.
          </p>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setConfirmDeleteFolder(null)} className="flex-1">
              إلغاء
            </SecondaryButton>
            <button
              onClick={() => handleDeleteFolder(confirmDeleteFolder)}
              className="flex-1 py-2.5 rounded-lg bg-critical text-white border-none font-bold text-sm cursor-pointer"
            >
              حذف نهائياً
            </button>
          </div>
        </Modal>
      )}

      {confirmDeleteDocId && (
        <Modal title="تأكيد الحذف" onClose={() => setConfirmDeleteDocId(null)}>
          <p className="text-sm text-ink-soft mb-5">هل أنت متأكد من حذف هذا الملف نهائياً؟</p>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setConfirmDeleteDocId(null)} className="flex-1">
              إلغاء
            </SecondaryButton>
            <button
              onClick={() => handleDeleteDocument(confirmDeleteDocId)}
              className="flex-1 py-2.5 rounded-lg bg-critical text-white border-none font-bold text-sm cursor-pointer"
            >
              حذف نهائياً
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
