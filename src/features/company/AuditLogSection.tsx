import { useAuditLog } from "@/features/company/api/useAuditLog";
import { useProfilesByIds } from "@/features/company/api/useProfilesByIds";
import {
  AUDIT_TABLE_LABEL,
  AUDIT_ACTION_LABEL,
  AUDIT_ACTION_TONE,
  fieldLabel,
  formatAuditValue,
  diffAuditRecord,
} from "@/features/company/lib/auditLabels";
import type { AuditLogEntry } from "@/types/domain";

function AuditRow({ entry, actorName }: { entry: AuditLogEntry; actorName: string }) {
  const diff = entry.action === "update" ? diffAuditRecord(entry.oldData, entry.newData) : [];
  const summarySource = entry.action === "delete" ? entry.oldData : entry.newData;

  return (
    <div className="bg-bg border border-line/60 rounded-lg px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${AUDIT_ACTION_TONE[entry.action]}`}>
            {AUDIT_ACTION_LABEL[entry.action]}
          </span>
          <span className="text-xs text-ink-soft bg-panel border border-line/60 rounded-full px-1.5 py-0.5">
            {AUDIT_TABLE_LABEL[entry.tableName] ?? entry.tableName}
          </span>
          <span className="text-sm font-semibold text-ink">{actorName}</span>
        </div>
        <span className="text-[11px] text-ink-soft shrink-0">
          {new Date(entry.createdAt).toLocaleString("ar-SA")}
        </span>
      </div>

      {entry.action === "update" ? (
        diff.length === 0 ? (
          <p className="text-xs text-ink-soft">لا تغييرات ذات دلالة</p>
        ) : (
          <div className="flex flex-col gap-1 mt-1.5">
            {diff.map((d) => (
              <div key={d.key} className="text-xs">
                <span className="text-ink-soft">{fieldLabel(d.key)}: </span>
                <span className="text-critical line-through">{formatAuditValue(d.oldValue)}</span>
                <span className="text-ink-soft mx-1">←</span>
                <span className="text-accent font-semibold">{formatAuditValue(d.newValue)}</span>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="text-xs text-ink-soft mt-1">
          {summarySource &&
            Object.entries(summarySource)
              .filter(([k]) => ["title", "contract_name", "item_name", "violation_name", "amount", "total_value"].includes(k))
              .map(([k, v]) => `${fieldLabel(k)}: ${formatAuditValue(v)}`)
              .join(" · ")}
        </div>
      )}
    </div>
  );
}

export function AuditLogSection({ companyId }: { companyId: string }) {
  const auditQuery = useAuditLog(companyId);
  const entries = auditQuery.data ?? [];
  const actorIds = entries.map((e) => e.actorId);
  const profilesQuery = useProfilesByIds(actorIds);
  const profiles = profilesQuery.data ?? new Map();

  return (
    <div>
      <p className="text-xs text-ink-soft mb-4">
        سجل تلقائي لكل إنشاء/تعديل/حذف على العقود والدفعات والأعمال الإضافية والخصومات وطلبات المواد ودفعات
        الميزانية — من فعل ماذا ومتى.
      </p>

      {auditQuery.isLoading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}

      {auditQuery.data && entries.length === 0 && (
        <div className="bg-panel border border-dashed border-line rounded-xl p-8 text-center text-sm text-ink-soft">
          لا توجد حركات مسجّلة بعد
        </div>
      )}

      <div className="flex flex-col gap-2">
        {entries.map((entry) => (
          <AuditRow key={entry.id} entry={entry} actorName={profiles.get(entry.actorId ?? "")?.fullName ?? "—"} />
        ))}
      </div>
    </div>
  );
}
