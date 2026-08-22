import { useRef, useState } from "react";
import { Paperclip, History } from "lucide-react";
import { SecondaryButton, ErrorText } from "@/components/ui";
import { useAddRequestAttachment, useAddRequestAttachmentRevision, useRequestAttachments } from "@/features/requests/api/useRequestAttachments";
import { uploadFile, uniqueFileName } from "@/lib/supabase/storage";
import { useAuth } from "@/features/auth/AuthContext";
import { fmt } from "@/utils/dates";

function RevisionHistory({ revisions }: { revisions: { id: string; revisionNumber: number; fileUrl: string; uploadedAt: string; note: string | null }[] }) {
  const [open, setOpen] = useState(false);
  if (revisions.length <= 1) return null;

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[10px] text-ink-soft inline-flex items-center gap-1 bg-transparent border-none cursor-pointer p-0"
      >
        <History size={11} /> {open ? "إخفاء النسخ السابقة" : `عرض النسخ السابقة (${revisions.length - 1})`}
      </button>
      {open && (
        <div className="flex flex-col gap-1 mt-1 mr-4">
          {revisions
            .slice(0, -1)
            .reverse()
            .map((r) => (
              <a key={r.id} href={r.fileUrl} target="_blank" rel="noreferrer" className="text-[10px] text-ink-soft hover:text-primary">
                نسخة {r.revisionNumber} — {fmt(r.uploadedAt)}
                {r.note ? ` — ${r.note}` : ""}
              </a>
            ))}
        </div>
      )}
    </div>
  );
}

export function RequestAttachmentsSection({ requestId, canEdit }: { requestId: string; canEdit: boolean }) {
  const { user } = useAuth();
  const attachmentsQuery = useRequestAttachments(requestId);
  const bundles = attachmentsQuery.data ?? [];
  const addAttachment = useAddRequestAttachment(requestId);
  const addRevisionFor = useAddRequestAttachmentRevision(requestId);

  const [uploading, setUploading] = useState(false);
  const [revisionNote, setRevisionNote] = useState<string | null>(null);
  const [error, setError] = useState("");
  const newFileInputRef = useRef<HTMLInputElement>(null);
  const revisionInputRef = useRef<HTMLInputElement>(null);
  const [revisionTargetId, setRevisionTargetId] = useState<string | null>(null);

  const handleNewFile = async (file: File | null) => {
    if (!file || !user) return;
    setError("");
    setUploading(true);
    try {
      const url = await uploadFile("documents", `${user.id}/${uniqueFileName(file.name)}`, file);
      await addAttachment.mutateAsync({ fileName: file.name, fileUrl: url });
    } catch {
      setError("تعذّر رفع الملف، حاول مجدداً");
    } finally {
      setUploading(false);
      if (newFileInputRef.current) newFileInputRef.current.value = "";
    }
  };

  const handleRevisionFile = async (file: File | null) => {
    if (!file || !user || !revisionTargetId) return;
    setError("");
    setUploading(true);
    try {
      const url = await uploadFile("documents", `${user.id}/${uniqueFileName(file.name)}`, file);
      await addRevisionFor.mutateAsync({ attachmentId: revisionTargetId, fileUrl: url, note: revisionNote?.trim() || null });
    } catch {
      setError("تعذّر رفع النسخة الجديدة، حاول مجدداً");
    } finally {
      setUploading(false);
      setRevisionTargetId(null);
      setRevisionNote(null);
      if (revisionInputRef.current) revisionInputRef.current.value = "";
    }
  };

  return (
    <div>
      <h4 className="text-xs font-bold text-ink-soft mb-2">المرفقات</h4>

      {bundles.length === 0 ? (
        <p className="text-xs text-ink-soft mb-2">لا توجد مرفقات بعد.</p>
      ) : (
        <div className="flex flex-col gap-2 mb-2">
          {bundles.map(({ attachment, revisions }) => {
            const latest = revisions[revisions.length - 1];
            return (
              <div key={attachment.id} className="bg-bg rounded-lg px-3 py-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <a
                    href={latest?.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary inline-flex items-center gap-1.5 min-w-0"
                  >
                    <Paperclip size={12} className="shrink-0" />
                    <span className="truncate">{attachment.fileName}</span>
                  </a>
                  {canEdit && (
                    <SecondaryButton
                      onClick={() => setRevisionTargetId(attachment.id)}
                      className="text-[10px] px-2 py-1 shrink-0"
                    >
                      رفع نسخة جديدة
                    </SecondaryButton>
                  )}
                </div>
                <RevisionHistory revisions={revisions} />
              </div>
            );
          })}
        </div>
      )}

      {canEdit && (
        <>
          <input ref={newFileInputRef} type="file" onChange={(e) => handleNewFile(e.target.files?.[0] ?? null)} className="text-xs" />
          {revisionTargetId && (
            <div className="mt-2 pt-2 border-t border-line/60">
              <p className="text-xs text-ink-soft mb-1">رفع نسخة جديدة — سيُحتفظ بالنسخة السابقة في السجل</p>
              <input ref={revisionInputRef} type="file" onChange={(e) => handleRevisionFile(e.target.files?.[0] ?? null)} className="text-xs" />
            </div>
          )}
          {uploading && <p className="text-xs text-ink-soft mt-1">جارٍ الرفع...</p>}
        </>
      )}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
