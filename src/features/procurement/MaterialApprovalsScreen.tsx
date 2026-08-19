import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, SecondaryButton, StatCard } from "@/components/ui";
import { useCompany } from "@/features/company/useCompany";
import { useCompanyMaterialRequests } from "@/features/procurement/api/useCompanyMaterialRequests";
import { MATERIAL_STATUS_LABEL, MATERIAL_STATUS_TONE } from "@/features/procurement/statusLabels";
import type { MaterialRequestStatus } from "@/types/domain";

type Filter = "pending" | "approved" | "rejected" | "all";

const PENDING_STATUSES: MaterialRequestStatus[] = [
  "sample_pending_pm_approval",
  "sample_pending_executive_approval",
  "purchase_pending_pm_approval",
  "purchase_pending_finance_approval",
];
const APPROVED_STATUSES: MaterialRequestStatus[] = ["sample_approved", "purchase_approved"];
const REJECTED_STATUSES: MaterialRequestStatus[] = ["sample_rejected", "purchase_rejected"];

function stageAgeTone(days: number | null): string {
  if (days === null) return "text-ink-soft";
  if (days >= 5) return "text-critical font-bold";
  if (days >= 2) return "text-warn font-bold";
  return "text-ink-soft";
}

export function MaterialApprovalsScreen() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const requestsQuery = useCompanyMaterialRequests(company.id);
  const [filter, setFilter] = useState<Filter>("pending");

  const items = requestsQuery.data ?? [];
  const pendingCount = items.filter((i) => PENDING_STATUSES.includes(i.request.status)).length;
  const approvedCount = items.filter((i) => APPROVED_STATUSES.includes(i.request.status)).length;
  const rejectedCount = items.filter((i) => REJECTED_STATUSES.includes(i.request.status)).length;
  const overdueCount = items.filter((i) => (i.daysAtCurrentStage ?? 0) >= 5).length;

  const filtered = items.filter((i) => {
    if (filter === "pending") return PENDING_STATUSES.includes(i.request.status);
    if (filter === "approved") return APPROVED_STATUSES.includes(i.request.status);
    if (filter === "rejected") return REJECTED_STATUSES.includes(i.request.status);
    return true;
  });

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-ink">طلبات المواد والمشتريات</h1>
        <SecondaryButton onClick={() => navigate("/")} className="text-sm">
          رجوع
        </SecondaryButton>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="معلّقة" value={pendingCount} tone={pendingCount > 0 ? "warn" : undefined} />
        <StatCard label="معتمدة" value={approvedCount} />
        <StatCard label="مرفوضة" value={rejectedCount} tone={rejectedCount > 0 ? "critical" : undefined} />
        <StatCard label="متأخرة (5+ أيام)" value={overdueCount} tone={overdueCount > 0 ? "critical" : undefined} />
      </div>

      <div className="flex gap-2 mb-4">
        {(
          [
            { key: "pending", label: "معلّقة" },
            { key: "approved", label: "معتمدة" },
            { key: "rejected", label: "مرفوضة" },
            { key: "all", label: "الكل" },
          ] as { key: Filter; label: string }[]
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-sm font-semibold px-3 py-1.5 rounded-lg cursor-pointer border ${
              filter === f.key ? "border-primary bg-primary-bg text-ink" : "border-line/60 bg-panel text-ink-soft"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {requestsQuery.isLoading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}

      {requestsQuery.data && filtered.length === 0 ? (
        <div className="bg-panel border border-dashed border-line rounded-xl p-10 text-center text-sm text-ink-soft">
          لا توجد طلبات هنا
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((item) => (
            <Card
              key={item.request.id}
              className="cursor-pointer hover:border-primary/40"
              onClick={() => navigate(`/projects/${item.projectId}/materials/${item.request.id}`)}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-ink truncate">{item.request.itemName}</span>
                    <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${MATERIAL_STATUS_TONE[item.request.status]}`}>
                      {MATERIAL_STATUS_LABEL[item.request.status]}
                    </span>
                  </div>
                  <div className="text-xs text-ink-soft mt-1">{item.projectName}</div>
                </div>

                {item.daysAtCurrentStage !== null && (
                  <div className={`text-xs shrink-0 ${stageAgeTone(item.daysAtCurrentStage)}`}>منذ {item.daysAtCurrentStage} يوم</div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
