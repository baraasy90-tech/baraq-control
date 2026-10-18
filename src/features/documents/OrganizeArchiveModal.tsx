import { useState } from "react";
import type { DocumentFolder, ProjectDocument } from "@/types/domain";
import { Modal, FieldLabel, TextInput, ErrorText, SecondaryButton, PrimaryButton } from "@/components/ui";
import { useOrganizeArchive } from "./api/useOrganizeArchive";
import { folderPath } from "./archiveIndex";
import { archiveNameError, renamedArchiveFile, splitArchiveFileName } from "./archiveNames";

export type ArchiveEditTarget = { kind: "folder"; folder: DocumentFolder } | { kind: "document"; document: ProjectDocument };

export function OrganizeArchiveModal({ projectId, folders, target, readOnly, onClose }: {
  projectId: string; folders: DocumentFolder[]; target: ArchiveEditTarget; readOnly: boolean; onClose: () => void;
}) {
  const original = target.kind === "folder" ? target.folder.name : target.document.name;
  const parts = splitArchiveFileName(original);
  const [name, setName] = useState(target.kind === "folder" ? original : parts.base);
  const [folderId, setFolderId] = useState(target.kind === "document" ? target.document.folderId : "");
  const [error, setError] = useState("");
  const mutation = useOrganizeArchive(projectId);
  const pending = mutation.isPending;
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly || pending) return;
    setError("");
    try {
      if (target.kind === "folder") await mutation.mutateAsync({ ...target, name: name.trim() });
      else await mutation.mutateAsync({ ...target, name: renamedArchiveFile(original, name), folderId });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error && /[\u0600-\u06ff]/.test(caught.message) ? caught.message : "تعذّر حفظ التنظيم. ربما تغير الملف أو المجلد أو صلاحياتك. احتفظ بمدخلاتك وحدّث القائمة قبل إعادة المحاولة.");
    }
  };
  return <Modal title={target.kind === "folder" ? "إعادة تسمية المجلد" : "تنظيم الملف"} onClose={() => { if (!pending) onClose(); }}>
    <form onSubmit={save} className="flex flex-col gap-4">
      <div><FieldLabel>الاسم الجديد</FieldLabel><TextInput autoFocus disabled={readOnly || pending} value={name} onChange={event => setName(event.target.value)} maxLength={200} />
      {target.kind === "document" && parts.extension && <p className="text-xs text-ink-soft mt-2">يبقى امتداد الملف {parts.extension} كما هو.</p>}</div>
      {target.kind === "document" && <div><FieldLabel>المجلد الوجهة</FieldLabel><select disabled={readOnly || pending} value={folderId} onChange={event => setFolderId(event.target.value)} className="w-full min-w-0 border border-line rounded-lg p-2.5 bg-panel text-sm">
        {folders.map(folder => <option key={folder.id} value={folder.id}>{folderPath(folders, folder.id).map(part => part.name).join(" / ")}</option>)}
      </select><p className="text-xs text-ink-soft mt-2">اختر مجلداً آخر لنقل الملف داخل هذا المشروع. يبقى محتوى الملف دون تغيير.</p></div>}
      {readOnly && <p role="status" className="text-xs text-critical">الكتابة غير متاحة حالياً؛ يمكنك إلغاء النافذة ومتابعة القراءة.</p>}
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2"><SecondaryButton type="button" disabled={pending} onClick={onClose} className="flex-1">إلغاء</SecondaryButton><PrimaryButton type="submit" disabled={readOnly || pending || !!archiveNameError(name) || (target.kind === "document" && !folders.some(folder => folder.id === folderId))} className="flex-1">{pending ? "جارٍ الحفظ..." : "حفظ التنظيم"}</PrimaryButton></div>
    </form>
  </Modal>;
}
