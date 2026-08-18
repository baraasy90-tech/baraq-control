import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, SecondaryButton, StatCard } from "@/components/ui";
import { useCompany } from "@/features/company/useCompany";
import { useCompanyApprovals, type ApprovalItem, type ApprovalStatus } from "@/features/contracts/api/useCompanyApprovals";
import { STATUS_LABEL, STATUS_TONE, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from "@/features/contracts/statusLabels";
import type { ContractStatus, PaymentApprovalStatus } from "@/types/domain";

type Filter = "pending" | "approved" | "rejected" | "all";

function statusLabel(item: ApprovalItem): string {
  return item.kind === "contract"
    ? STATUS_LABEL[item.status as ContractStatus]
    : PAYMENT_STATUS_LABEL[item.status as PaymentApprovalStatus];
}

function statusTone(item: ApprovalItem): string {
  return item.kind === "contract"
    ? STATUS_TONE[item.status as ContractStatus]
    : PAYMENT_STATUS_TONE[item.status as PaymentApprovalStatus];
}

function isPending(status: ApprovalStatus): boolean {
  return status === "pending_pm_approval" || status === "pending_finance_approval";
}

function stageAgeTone(days: number | null): string {
  if (days === null) return "text-ink-soft";
  if (days >= 5) return "text-critical font-bold";
  if (days >= 2) return "text-warn font-bold";
  return "text-ink-soft";
}

function currentStageLabel(status: ApprovalStatus): string {
  if (status === "pending_pm_approval") return "بانتظار إدارة المشاريع";
  if (status === "pending_finance_approval") return "بانتظار المالية";
  return "—";
}

export function ApprovalsScreen() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const approvalsQuery = useCompanyApprovals(company.id);
  const [filter, setFilter] = useState<Filter>("pending");

  const items = approvalsQuery.data ?? [];
  const pendingCount = items.filter((i) => isPending(i.status)).length;
  const approvedCount = items.filter((i) => i.status === "approved").length;
  const rejectedCount = items.filter((i) => i.status === "rejected").length;
  const overdueCount = items.filter((i) => (i.daysAtCurrentStage ?? 0) >= 5).length;

  const filtered = items.filter((i) => {
    if (filter === "pending") return isPending(i.status);
    if (filter === "approved") return i.status === "approved";
    if (filter === "rejected") return i.status === "rejected";
    return true;
  });

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-ink">الاعتمادات</h1>
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

      {approvalsQuery.isLoading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}

      {approvalsQuery.data && filtered.length === 0 ? (
        <div className="bg-panel border border-dashed border-line rounded-xl p-10 text-center text-sm text-ink-soft">
          لا توجد معاملات هنا
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((item) => (
            <Card
              key={`${item.kind}-${item.id}`}
              className="cursor-pointer hover:border-primary/40"
              onClick={() => navigate(`/projects/${item.projectId}/contract/${item.contractId}`)}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-ink-soft bg-bg rounded-full px-1.5 py-0.5">
                      {item.kind === "contract" ? "عقد" : "دفعة"}
                    </span>
                    <span className="text-sm font-bold text-ink truncate">{item.title}</span>
                    <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${statusTone(item)}`}>
                      {statusLabel(item)}
                    </span>
                  </div>
                  <div className="text-xs text-ink-soft mt-1">
                    {item.projectName}
                    {item.kind === "payment" ? ` · ${item.contractName}` : ""}
                  </div>
                </div>

                <div className="text-left shrink-0">
                  {isPending(item.status) && (
                    <div className={`text-xs ${stageAgeTone(item.daysAtCurrentStage)}`}>
                      {currentStageLabel(item.status)} · منذ {item.daysAtCurrentStage} يوم
                    </div>
                  )}
                  {item.status === "approved" && (
                    <div className="text-xs text-ink-soft">
                      {item.pmStageDays !== null && <div>إدارة المشاريع: {item.pmStageDays} يوم</div>}
                      {item.financeStageDays !== null && <div>المالية: {item.financeStageDays} يوم</div>}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
