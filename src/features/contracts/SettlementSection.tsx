import { useState } from "react";
import { Card, StatCard, SecondaryButton, PrimaryButton, TextInput, ErrorText } from "@/components/ui";
import { useSubmitSettlement, useReviewSettlement } from "@/features/contracts/api/useContractSettlement";
import { useProfilesByIds } from "@/features/company/api/useProfilesByIds";
import { approverTitle } from "@/features/company/lib/approverTitle";
import { ApproverBadge } from "@/features/contracts/ApproverBadge";
import { printSettlementCertificate } from "@/features/contracts/lib/printSettlementCertificate";
import { fmtMoney } from "@/utils/money";
import { getErrorMessage } from "@/utils/errors";
import type { Contract, Company, Department, DepartmentMember } from "@/types/domain";

const SETTLEMENT_LABEL: Record<string, string> = {
  open: "لم تبدأ",
  pending_pm_approval: "بانتظار اعتماد مدير المشاريع",
  pending_finance_approval: "بانتظار الاعتماد المالي",
  settled: "تمت التصفية النهائية",
  rejected: "مرفوضة — يمكن إعادة التقديم",
};

const SETTLEMENT_TONE: Record<string, string> = {
  open: "text-ink-soft bg-bg",
  pending_pm_approval: "text-warn bg-warn-bg",
  pending_finance_approval: "text-warn bg-warn-bg",
  settled: "text-accent bg-accent-bg",
  rejected: "text-critical bg-critical-bg",
};

export function SettlementSection({
  contract,
  projectName,
  company,
  departments,
  members,
  canPmApprove,
  canFinanceApprove,
  originalValue,
  approvedExtraWorksTotal,
  totalDeductions,
  retentionHeld,
  totalPaidNet,
  isIndividual,
}: {
  contract: Contract;
  projectName: string;
  company: Company;
  departments: Department[];
  members: DepartmentMember[];
  canPmApprove: boolean;
  canFinanceApprove: boolean;
  originalValue: number;
  approvedExtraWorksTotal: number;
  totalDeductions: number;
  retentionHeld: number;
  totalPaidNet: number;
  isIndividual: boolean;
}) {
  const submitSettlement = useSubmitSettlement(contract.id);
  const reviewSettlement = useReviewSettlement(contract.id);
  const [note, setNote] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [error, setError] = useState("");
  const [finalizing, setFinalizing] = useState(false);

  const approverProfilesQuery = useProfilesByIds([
    contract.settlementSubmittedBy,
    contract.settlementPmReviewedBy,
    contract.settlementFinanceReviewedBy,
  ]);
  const approverProfiles = approverProfilesQuery.data ?? new Map();

  const entitlement = originalValue + approvedExtraWorksTotal - totalDeductions;
  const retentionOwed = contract.retentionReleased ? 0 : retentionHeld;
  const finalBalance = entitlement - totalPaidNet - retentionOwed;

  const handleSubmit = async () => {
    setError("");
    try {
      await submitSettlement.mutateAsync(note.trim() || null);
    } catch {
      setError("تعذّر بدء إجراءات التصفية، حاول مجدداً");
    }
  };

  const handleFinalizeSettlement = async () => {
    setError("");
    setFinalizing(true);
    try {
      await submitSettlement.mutateAsync(note.trim() || null);
      await reviewSettlement.mutateAsync({ approve: true, note: null });
      await reviewSettlement.mutateAsync({ approve: true, note: null });
    } catch (err) {
      setError(getErrorMessage(err, "تعذّر اعتماد التصفية النهائية، حاول مجدداً"));
    } finally {
      setFinalizing(false);
    }
  };

  const handleReview = async (approve: boolean) => {
    await reviewSettlement.mutateAsync({ approve, note: reviewNote.trim() || null });
    setReviewNote("");
  };

  const handlePrint = () => {
    printSettlementCertificate({
      companyName: company.name,
      projectName,
      contractName: contract.name,
      originalValue,
      approvedExtraWorks: approvedExtraWorksTotal,
      totalDeductions,
      totalPaid: totalPaidNet,
      retentionHeld: retentionOwed,
      finalBalance,
      settledAt: contract.settledAt,
      signers: [
        {
          label: "اعتماد إدارة المشاريع",
          fullName: approverProfiles.get(contract.settlementPmReviewedBy ?? "")?.fullName ?? "",
          title: contract.settlementPmReviewedBy
            ? approverTitle(contract.settlementPmReviewedBy, "project_management", company, departments, members)
            : "",
          signatureUrl: approverProfiles.get(contract.settlementPmReviewedBy ?? "")?.signatureUrl ?? null,
          at: contract.settlementPmReviewedAt,
        },
        {
          label: "الاعتماد المالي النهائي",
          fullName: approverProfiles.get(contract.settlementFinanceReviewedBy ?? "")?.fullName ?? "",
          title: contract.settlementFinanceReviewedBy
            ? approverTitle(contract.settlementFinanceReviewedBy, "finance", company, departments, members)
            : "",
          signatureUrl: approverProfiles.get(contract.settlementFinanceReviewedBy ?? "")?.signatureUrl ?? null,
          at: contract.settlementFinanceReviewedAt,
        },
      ],
      print: company.print,
    });
  };

  if (contract.status !== "approved") return null;

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-bold text-ink">التصفية النهائية</h2>
        <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${SETTLEMENT_TONE[contract.settlementStatus]}`}>
          {SETTLEMENT_LABEL[contract.settlementStatus]}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <StatCard label="القيمة الإجمالية بعد الإضافات" value={fmtMoney(entitlement + totalDeductions)} />
        <StatCard label="إجمالي الخصومات" value={totalDeductions > 0 ? `-${fmtMoney(totalDeductions)}` : "—"} />
        <StatCard label="الاستحقاق الصافي" value={fmtMoney(entitlement)} />
        <StatCard label="إجمالي المدفوع فعلياً" value={totalPaidNet > 0 ? `-${fmtMoney(totalPaidNet)}` : "—"} />
        <StatCard label="ضمان محتجز غير مسترد" value={retentionOwed > 0 ? `-${fmtMoney(retentionOwed)}` : "—"} />
        <StatCard label="الرصيد النهائي المستحق" value={fmtMoney(finalBalance)} tone={finalBalance < 0 ? "critical" : undefined} />
      </div>

      {(contract.settlementStatus === "open" || contract.settlementStatus === "rejected") && (
        <div>
          {contract.settlementStatus === "rejected" && (
            <p className="text-xs text-critical mb-2">
              سبب الرفض: {contract.settlementFinanceReviewNote || contract.settlementPmReviewNote || "بدون سبب"}
            </p>
          )}
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة التصفية (اختياري)" />
          <ErrorText>{error}</ErrorText>
          {isIndividual ? (
            <PrimaryButton onClick={handleFinalizeSettlement} disabled={finalizing} className="w-auto px-4 py-2 text-xs mt-2">
              {finalizing ? "جارٍ الاعتماد..." : "اعتماد التصفية النهائية"}
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={handleSubmit} disabled={submitSettlement.isPending} className="w-auto px-4 py-2 text-xs mt-2">
              {submitSettlement.isPending ? "جارٍ التقديم..." : "بدء إجراءات التصفية النهائية"}
            </PrimaryButton>
          )}
        </div>
      )}

      {contract.settlementStatus === "pending_pm_approval" &&
        (canPmApprove ? (
          <div>
            <TextInput
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="ملاحظة الاعتماد/الرفض (اختياري)"
            />
            <div className="flex gap-2 mt-2">
              <PrimaryButton onClick={() => handleReview(true)} disabled={reviewSettlement.isPending} className="w-auto px-4 py-2 text-xs">
                اعتماد وتحويل للمالية
              </PrimaryButton>
              <SecondaryButton onClick={() => handleReview(false)} disabled={reviewSettlement.isPending} className="text-xs px-3 py-2">
                رفض
              </SecondaryButton>
            </div>
          </div>
        ) : (
          <p className="text-xs text-ink-soft">بانتظار اعتماد رئيس قسم إدارة المشاريع.</p>
        ))}

      {contract.settlementStatus === "pending_finance_approval" &&
        (canFinanceApprove ? (
          <div>
            <TextInput
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="ملاحظة الاعتماد/الرفض (اختياري)"
            />
            <div className="flex gap-2 mt-2">
              <PrimaryButton onClick={() => handleReview(true)} disabled={reviewSettlement.isPending} className="w-auto px-4 py-2 text-xs">
                الاعتماد النهائي للتصفية
              </PrimaryButton>
              <SecondaryButton onClick={() => handleReview(false)} disabled={reviewSettlement.isPending} className="text-xs px-3 py-2">
                رفض
              </SecondaryButton>
            </div>
          </div>
        ) : (
          <p className="text-xs text-ink-soft">اعتُمدت مبدئياً من إدارة المشاريع — بانتظار الاعتماد المالي النهائي.</p>
        ))}

      {contract.settlementStatus === "settled" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ApproverBadge
            label="اعتماد إدارة المشاريع"
            userId={contract.settlementPmReviewedBy}
            title={
              contract.settlementPmReviewedBy
                ? approverTitle(contract.settlementPmReviewedBy, "project_management", company, departments, members)
                : ""
            }
            profiles={approverProfiles}
            at={contract.settlementPmReviewedAt}
            note={contract.settlementPmReviewNote}
          />
          <ApproverBadge
            label="الاعتماد المالي النهائي"
            userId={contract.settlementFinanceReviewedBy}
            title={
              contract.settlementFinanceReviewedBy
                ? approverTitle(contract.settlementFinanceReviewedBy, "finance", company, departments, members)
                : ""
            }
            profiles={approverProfiles}
            at={contract.settlementFinanceReviewedAt}
            note={contract.settlementFinanceReviewNote}
          />
          <SecondaryButton onClick={handlePrint} className="text-xs px-3 py-1.5 w-auto sm:col-span-2">
            طباعة شهادة التصفية النهائية
          </SecondaryButton>
        </div>
      )}
    </Card>
  );
}
