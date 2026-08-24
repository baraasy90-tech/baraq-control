import { useState } from "react";
import { ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useRecordAuditLog } from "@/features/company/api/useAuditLog";
import { useProfilesByIds } from "@/features/company/api/useProfilesByIds";
import { AuditRow } from "@/features/company/AuditLogSection";

/** سجل حركة مصغّر يُعرض داخل شاشة سجل بذاته (عقد/طلب مادة/طلب داخلي...) — من فعل
 * ماذا ومتى على هذا السجل تحديداً، بدل الاضطرار لفتح شاشة سجل التدقيق العامة
 * والبحث فيها. يظهر فقط لمن يملك صلاحية الوصول لهذا السجل (RLS تتحكم بذلك تلقائياً). */
export function RecordAuditTimeline({ tableName, recordId }: { tableName: string; recordId: string | undefined }) {
  const [open, setOpen] = useState(false);
  const auditQuery = useRecordAuditLog(tableName, recordId);
  const entries = auditQuery.data ?? [];
  const actorIds = entries.map((e) => e.actorId);
  const profilesQuery = useProfilesByIds(actorIds);
  const profiles = profilesQuery.data ?? new Map();

  if (!recordId) return null;

  return (
    <div className="border border-line/60 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-bg border-none cursor-pointer text-right"
      >
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-soft">
          <ShieldCheck size={14} strokeWidth={2.2} /> سجل الحركة على هذا السجل
          {entries.length > 0 && <span className="text-ink-soft/70">({entries.length})</span>}
        </span>
        {open ? <ChevronUp size={14} className="text-ink-soft" /> : <ChevronDown size={14} className="text-ink-soft" />}
      </button>

      {open && (
        <div className="px-4 py-3 flex flex-col gap-2">
          {auditQuery.isLoading && <p className="text-xs text-ink-soft">جارٍ التحميل...</p>}
          {!auditQuery.isLoading && entries.length === 0 && (
            <p className="text-xs text-ink-soft">لا توجد حركات مسجّلة بعد</p>
          )}
          {entries.map((entry) => (
            <AuditRow key={entry.id} entry={entry} actorName={profiles.get(entry.actorId ?? "")?.fullName ?? "—"} />
          ))}
        </div>
      )}
    </div>
  );
}
