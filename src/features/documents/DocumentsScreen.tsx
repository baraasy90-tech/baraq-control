import { useSubscriptionWriteAccess } from "@/features/billing/useSubscriptionWriteAccess";
import { ProjectWriteStatus } from "@/features/billing/ProjectWriteStatus";
import { useState } from "react";
import { useNavigate, useSearchParams, useBlocker } from "react-router-dom";
import { Folder, FileText, Trash2, Pencil } from "lucide-react";
import { QueryFailureScreen } from "@/components/QueryFailureScreen";
import { SecondaryButton, PrimaryButton, IconButton, Modal, ErrorText, TextInput, FieldLabel } from "@/components/ui";
import { useDocumentFolders } from "@/features/documents/api/useDocumentFolders";
import { useDocuments } from "@/features/documents/api/useDocuments";
import { useCreateFolder } from "@/features/documents/api/useCreateFolder";
import { useDeleteFolder } from "@/features/documents/api/useDeleteFolder";
import { ArchiveExportPanel } from "./ArchiveExportPanel";
import { ArchiveUploadPanel } from "./ArchiveUploadPanel";
import { useDeleteDocument } from "@/features/documents/api/useDeleteDocument";
import type { DocumentFolder, Project, ProjectDocument } from "@/types/domain";
import { getFileUrl } from "@/lib/supabase/storage";
import { useProjectDocumentIndex } from "./api/useProjectDocumentIndex";
import { ArchiveFolderTree } from "./ArchiveFolderTree";
import { ArchiveSearchResults } from "./ArchiveSearchResults";
import { folderPath, type ArchiveFileType } from "./archiveIndex";
import {documentCategories,type DocumentCategory} from "./documentMetadata";
import {DocumentMetadataSummary} from "./DocumentMetadataSummary";
import {ArchiveTrashModal} from "./ArchiveTrashModal";
import {getUserErrorMessage} from "@/utils/errors";
import { OrganizeArchiveModal, type ArchiveEditTarget } from "./OrganizeArchiveModal";

export function DocumentsScreen({ project }: { project: Project }) {
  const navigate = useNavigate();
  const { readOnly } = useSubscriptionWriteAccess(project.id);
  const foldersQuery = useDocumentFolders(project.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedFolderId = searchParams.get("folder");
  const folders = foldersQuery.data ?? [];
  const currentFolderId = folders.some(folder => folder.id === requestedFolderId) ? requestedFolderId : null;
  const [search, setSearch] = useState("");
  const [fileType, setFileType] = useState<ArchiveFileType>("all");
  const [category,setCategory]=useState<DocumentCategory|"all">("all");
  const searching = !!search.trim() || fileType !== "all" || category !== "all";
  const indexQuery = useProjectDocumentIndex(project.id, folders.map(folder => folder.id), searching && foldersQuery.isSuccess);
  const setCurrentFolderId = (id: string | null) => {
    setSearch("");
    setFileType("all");setCategory("all");
    setSearchParams(previous => { const next = new URLSearchParams(previous); if (id) next.set("folder", id); else next.delete("folder"); return next; });
  };
  const documentsQuery = useDocuments(currentFolderId ?? undefined);
  const createFolder = useCreateFolder(project.id);
  const deleteFolder = useDeleteFolder(project.id);

  const deleteDocument = useDeleteDocument(project.id);

  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<DocumentFolder | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<ProjectDocument | null>(null);
  const [trashOpen,setTrashOpen]=useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const busy = uploading || exporting;
  const blocker = useBlocker(busy);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<ArchiveEditTarget | null>(null);
  const openOrganize = (target: ArchiveEditTarget) => { if (!readOnly && !busy) setEditTarget(target); };
  const handleOpenDocument = async (id: string, stored: string, name: string) => {
    setError("");setOpeningId(id);
    const preview=/\.(pdf|txt|csv|png|jpe?g|webp|gif|bmp|tiff?|mp4|webm|mov|mp3|m4a|wav|ogg)$/i.test(name.includes('.')?name:stored.split('?')[0]);
    const tab = preview ? window.open("about:blank", "_blank") : null;
    if (tab) tab.opener = null;
    try {
      const url = await getFileUrl("documents", stored,preview?undefined:name);
      if (!url) throw new Error("تعذّر الوصول للملف");
      if (!preview) { const link=document.createElement('a');link.href=url;link.download=name;link.rel='noopener';document.body.appendChild(link);link.click();link.remove(); }
      else if (tab) tab.location.replace(url);
      else { setError("اسمح بفتح نافذة المستند في إعدادات المتصفح ثم حاول مجدداً"); }
    } catch { tab?.close();setError("تعذّر فتح المستند، حاول مجدداً"); }
    finally { setOpeningId(null); }
  };

  const documents = documentsQuery.data ?? [];
  const subfolders = folders.filter((f) => f.parentFolderId === currentFolderId);

  const breadcrumb = folderPath(folders, currentFolderId);

  const handleCreateFolder = async () => {
    if (readOnly) return;
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
    if (readOnly) return;
    try {
      await deleteFolder.mutateAsync(folder);
      if (currentFolderId === folder.id) setCurrentFolderId(folder.parentFolderId);
      setConfirmDeleteFolder(null);
    } catch(caught) {setError(getUserErrorMessage(caught,"تعذّر نقل المجلد إلى السلة؛ تحقق من النتيجة قبل إعادة المحاولة."));}
  };


  const handleDeleteDocument = async (doc: ProjectDocument) => {
    if (readOnly) return;
    try {
      await deleteDocument.mutateAsync(doc);
      setConfirmDeleteDoc(null);
    } catch(caught) {setError(getUserErrorMessage(caught,"تعذّر نقل المستند إلى السلة؛ تحقق من النتيجة قبل إعادة المحاولة."));}
  };

  if (foldersQuery.isError && !foldersQuery.data) {
    return <QueryFailureScreen title="مستندات المشروع" retry={() => Promise.all([foldersQuery.refetch(), ...(currentFolderId ? [documentsQuery.refetch()] : [])])} />;
  }
  if (foldersQuery.isPending) return <p role="status" className="p-6">جارٍ تحميل البيانات...</p>;

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-6xl mx-auto">
      <ProjectWriteStatus projectId={project.id} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-ink truncate">المستندات — {project.name}</h1>
        <SecondaryButton disabled={busy} onClick={()=>setTrashOpen(true)}>سلة المحذوفات</SecondaryButton>
        <SecondaryButton onClick={() => navigate(`/projects/${project.id}`)}>رجوع</SecondaryButton>
      </div>

      <div className="bg-panel border border-line/60 rounded-xl p-4 mb-5">
        <h2 className="text-sm font-bold mb-1">أرشيف المشروع</h2>
        <p className="text-xs text-ink-soft mb-3">ابحث بالاسم أو المرجع أو التصنيف أو التاريخ أو الوصف في جميع مجلدات المشروع. البحث داخل محتوى الوثائق سيُضاف لاحقاً.</p>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-0 basis-56"><FieldLabel>البحث في الأرشيف</FieldLabel><TextInput type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="مثال: اعتماد مخططات أو عقد الاستشاري" /></div>
          <div><FieldLabel>نوع الملف</FieldLabel><select value={fileType} onChange={event => setFileType(event.target.value as ArchiveFileType)} className="border border-line rounded-lg p-2.5 bg-panel text-sm">
            <option value="all">جميع الأنواع والمجلدات</option><option value="pdf">PDF</option><option value="image">صور</option><option value="office">مستندات وجداول وعروض</option><option value="other">أنواع أخرى</option>
          </select></div>
          <div><FieldLabel>تصنيف الأرشيف</FieldLabel><select value={category} onChange={event=>setCategory(event.target.value as DocumentCategory|"all")} className="max-w-full border border-line rounded-lg p-2.5 bg-panel text-sm"><option value="all">جميع التصنيفات</option>{Object.entries(documentCategories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div>
          {searching && <SecondaryButton className="self-end" onClick={() => { setSearch(""); setFileType("all");setCategory("all"); }}>مسح البحث</SecondaryButton>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-5 items-start">
      <ArchiveFolderTree key={project.id} folders={folders} currentFolderId={currentFolderId} onOpen={setCurrentFolderId} />
      <main className="min-w-0">
      {requestedFolderId && !currentFolderId && <p role="status" className="text-xs text-ink-soft mb-3">المجلد المطلوب غير متاح، ربما حُذف أو تغيرت صلاحيات الوصول إليه. تظهر المجلدات المتاحة لك.</p>}
      {(foldersQuery.isError || (!searching && documentsQuery.isError)) && <div role="alert" className="text-xs text-critical mb-3">تعذّر تحميل أحدث بيانات الأرشيف. ما يظهر قد يكون من آخر تحميل ناجح. <button type="button" onClick={() => { void foldersQuery.refetch(); if (currentFolderId) void documentsQuery.refetch(); }}>إعادة المحاولة</button></div>}

      <nav aria-label="مسار المجلد الحالي" className="flex items-center flex-wrap gap-1 text-sm mb-4 break-words">
        <button
          onClick={() => setCurrentFolderId(null)}
          className={`cursor-pointer bg-transparent border-none ${currentFolderId === null ? "font-bold text-ink" : "text-primary"}`}
        >
          📁 الرئيسية
        </button>
        {breadcrumb.map((f) => (
          <span key={f.id} className="flex items-center gap-1 min-w-0 max-w-full">
            <span className="text-ink-soft">/</span>
            <button
              onClick={() => setCurrentFolderId(f.id)}
              className={`cursor-pointer bg-transparent border-none text-right break-all min-w-0 ${f.id === currentFolderId ? "font-bold text-ink" : "text-primary"}`}
            >
              {f.name}
            </button>
          </span>
        ))}
      </nav>

      <ArchiveExportPanel key={project.id} project={project} folderId={currentFolderId} disabled={uploading} onBusyChange={setExporting} />
      <ArchiveUploadPanel projectId={project.id} folderId={currentFolderId} readOnly={readOnly || exporting} onBusyChange={setUploading} />
      {!searching && <div className="flex gap-2 mb-5">
        <SecondaryButton disabled={readOnly || busy} onClick={() => setFolderModalOpen(true)} className="text-sm">
          + مجلد جديد
        </SecondaryButton>

      </div>}

      <ErrorText>{error}</ErrorText>

      {!searching && (foldersQuery.isLoading || (currentFolderId && documentsQuery.isLoading)) && (
        <p className="text-sm text-ink-soft">جارٍ التحميل...</p>
      )}

      {searching ? (indexQuery.isError ? <div role="alert" className="text-sm text-critical">تعذّر إكمال البحث؛ لم نعرض نتائج جزئية. <SecondaryButton onClick={() => void indexQuery.refetch()}>إعادة البحث</SecondaryButton></div> : indexQuery.isPending ? <p role="status" className="text-sm text-ink-soft">جارٍ البحث في مجلدات المشروع...</p> :
        <ArchiveSearchResults key={`${search.trim()}-${fileType}-${category}`} folders={folders} documents={indexQuery.data ?? []} query={search} type={fileType} category={category} opening={openingId !== null} onOpenFolder={setCurrentFolderId} onOpenFile={doc => void handleOpenDocument(doc.id, doc.fileUrl,doc.name)} readOnly={readOnly || busy} onOrganize={openOrganize} />
      ) : subfolders.length === 0 && documents.length === 0 && !documentsQuery.isError && !foldersQuery.isLoading && !(currentFolderId && documentsQuery.isPending) ? (
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
                className="flex-1 min-w-0 text-right flex items-center gap-2 cursor-pointer bg-transparent border-none"
              >
                <Folder size={18} className="text-primary shrink-0" strokeWidth={2} />
                <span className="text-sm font-semibold text-ink truncate">{folder.name}</span>
              </button>
              <IconButton disabled={readOnly||busy} icon={Pencil} label={`إعادة تسمية ${folder.name}`} onClick={() => openOrganize({ kind: "folder", folder })} />
              <IconButton disabled={readOnly||busy} icon={Trash2} label="حذف" tone="critical" onClick={() => {setError("");setConfirmDeleteFolder(folder);}} />
            </div>
          ))}

          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-2 bg-panel border border-line/60 shadow-sm rounded-lg px-4 py-3"
            >
              <div className="flex-1 min-w-0"><button
                type="button" disabled={openingId !== null}
                onClick={() => handleOpenDocument(doc.id, doc.fileUrl,doc.name)}
                className="w-full min-w-0 flex flex-wrap items-center gap-2 text-ink text-right bg-transparent border-none cursor-pointer disabled:opacity-50"
              >
                <FileText size={18} className="text-ink-soft shrink-0" strokeWidth={2} />
                <span className="text-sm font-medium truncate">{doc.name}</span>
                <span className="text-xs text-ink-soft shrink-0">
                  {new Date(doc.uploadedAt).toLocaleDateString("ar-SA")}
                </span>
              </button>
              <DocumentMetadataSummary document={doc}/></div>
              <IconButton disabled={readOnly||busy} icon={Pencil} label={`تنظيم ${doc.name}`} onClick={() => openOrganize({ kind: "document", document: doc })} />
              <IconButton disabled={readOnly||busy} icon={Trash2} label="حذف" tone="critical" onClick={() => {setError("");setConfirmDeleteDoc(doc);}} />
            </div>
          ))}
        </div>
      )}

      </main>
      </div>

      {blocker.state === "blocked" && <Modal title={uploading ? "عملية رفع جارية" : "عملية تنزيل جارية"} onClose={() => blocker.reset()}><p className="text-sm mb-4">انتظر اكتمال العملية أو أوقف الملفات المتبقية قبل مغادرة الصفحة، لتبقى نتيجة كل ملف واضحة.</p><PrimaryButton onClick={() => blocker.reset()}>البقاء في الصفحة</PrimaryButton></Modal>}
      {trashOpen&&<ArchiveTrashModal projectId={project.id} readOnly={readOnly} onClose={()=>setTrashOpen(false)}/>}
      {editTarget && <OrganizeArchiveModal projectId={project.id} folders={folders} target={editTarget} readOnly={readOnly} onClose={() => setEditTarget(null)} />}

      {folderModalOpen && (
        <Modal title="مجلد جديد" onClose={() => setFolderModalOpen(false)}>
          <FieldLabel>اسم المجلد</FieldLabel>
          <TextInput disabled={readOnly} value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} />
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2 mt-4">
            <SecondaryButton onClick={() => setFolderModalOpen(false)} className="flex-1">
              إلغاء
            </SecondaryButton>
            <PrimaryButton onClick={handleCreateFolder} disabled={readOnly || (!newFolderName.trim() || createFolder.isPending)} className="flex-1">
              {createFolder.isPending ? "جارٍ الإنشاء..." : "إنشاء"}
            </PrimaryButton>
          </div>
        </Modal>
      )}

      {confirmDeleteFolder && (
        <Modal title="تأكيد الحذف" onClose={() => setConfirmDeleteFolder(null)}>
          <p className="text-sm text-ink-soft mb-5">
            هل أنت متأكد من حذف مجلد "{confirmDeleteFolder.name}"؟ سينتقل هو ومحتواه إلى السلة دون حذف الملفات من التخزين، ويمكن استعادته لاحقاً.
          </p>
          {error&&<p role="alert" className="text-sm text-critical">{error}</p>}
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setConfirmDeleteFolder(null)} className="flex-1">
              إلغاء
            </SecondaryButton>
            <button disabled={readOnly || deleteFolder.isPending}
              onClick={() => handleDeleteFolder(confirmDeleteFolder)}
              className="flex-1 py-2.5 rounded-lg bg-critical text-white border-none font-bold text-sm cursor-pointer"
            >
              نقل إلى السلة
            </button>
          </div>
        </Modal>
      )}

      {confirmDeleteDoc && (
        <Modal title="تأكيد الحذف" onClose={() => setConfirmDeleteDoc(null)}>
          <p className="text-sm text-ink-soft mb-5">سينتقل الملف إلى السلة ويمكن استعادته لاحقاً دون تغيير محتواه.</p>
          {error&&<p role="alert" className="text-sm text-critical">{error}</p>}
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setConfirmDeleteDoc(null)} className="flex-1">
              إلغاء
            </SecondaryButton>
            <button disabled={readOnly || deleteDocument.isPending}
              onClick={() => handleDeleteDocument(confirmDeleteDoc)}
              className="flex-1 py-2.5 rounded-lg bg-critical text-white border-none font-bold text-sm cursor-pointer"
            >
              نقل إلى السلة
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
