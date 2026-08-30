import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FileText, Trash2, Upload } from "lucide-react";
import { Card, StatCard, SecondaryButton, PrimaryButton, IconButton, FieldLabel, TextInput, ErrorText, Modal } from "@/components/ui";
import { useContract } from "@/features/contracts/api/useContract";
import { useSaveContract } from "@/features/contracts/api/useSaveContract";
import { useSubmitContract, useReviewContract, useSubmitPayment, useReviewPayment } from "@/features/contracts/api/useContractApproval";
import {
  useAddLineItem,
  useDeleteLineItem,
  useAddPayment,
  useTogglePaymentPaid,
  useDeletePayment,
  useAddDeduction,
  useDeleteDeduction,
} from "@/features/contracts/api/useContractItems";
import { useCompany } from "@/features/company/useCompany";
import { useDepartments } from "@/features/company/api/useDepartments";
import { useDepartmentMembers } from "@/features/company/api/useDepartmentMembers";
import { useProject } from "@/features/projects/api/useProject";
import { useActivities } from "@/features/schedule/api/useActivities";
import { useCreateActivity } from "@/features/schedule/api/useCreateActivity";
import { fmtMoney } from "@/utils/money";
import { fmt } from "@/utils/dates";
import { STATUS_LABEL, STATUS_TONE, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from "@/features/contracts/statusLabels";
import { printRetentionCertificate } from "@/features/contracts/lib/printRetentionCertificate";
import { ExtraWorksSection } from "@/features/contracts/ExtraWorksSection";
import { useExtraWorks } from "@/features/contracts/api/useExtraWorks";
import { useProfilesByIds } from "@/features/company/api/useProfilesByIds";
import { approverTitle } from "@/features/company/lib/approverTitle";
import { ApproverBadge } from "@/features/contracts/ApproverBadge";
import { SettlementSection } from "@/features/contracts/SettlementSection";
import { computeVat } from "@/features/contracts/lib/vat";
import { RecordAuditTimeline } from "@/features/company/RecordAuditTimeline";
import { getErrorMessage } from "@/utils/errors";

function numOrNull(v: string): number | null {
  const n = Number(v);
  return v.trim() === "" || Number.isNaN(n) ? null : n;
}

export function ContractScreen() {
  const { id: projectId, contractId } = useParams<{ id: string; contractId: string }>();
  const navigate = useNavigate();
  const bundleQuery = useContract(contractId);
  const projectQuery = useProject(projectId);
  const project = projectQuery.data;
  const saveContract = useSaveContract();
  const submitContract = useSubmitContract();
  const reviewContract = useReviewContract();
  const activitiesQuery = useActivities(projectId);
  const createActivity = useCreateActivity();
  const [reviewNoteInput, setReviewNoteInput] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState("");
  const [offerDraftActivity, setOfferDraftActivity] = useState<{ name: string; amount: number } | null>(null);
  const [creatingDraftActivity, setCreatingDraftActivity] = useState(false);
  const [draftActivityError, setDraftActivityError] = useState("");

  const { company, profile } = useCompany();
  const departmentsQuery = useDepartments(company.id);
  const departments = departmentsQuery.data ?? [];
  const membersQuery = useDepartmentMembers(departments.map((d) => d.id));
  const members = membersQuery.data ?? [];
  const isOwner = company.createdBy === profile.id;
  const isExecutive = members.some(
    (m) => m.userId === profile.id && departments.find((d) => d.id === m.departmentId)?.type === "executive"
  );
  const isPmDeptHead = members.some(
    (m) =>
      m.userId === profile.id &&
      m.role === "head" &&
      departments.find((d) => d.id === m.departmentId)?.type === "project_management"
  );
  const isFinanceDeptHead = members.some(
    (m) =>
      m.userId === profile.id && m.role === "head" && departments.find((d) => d.id === m.departmentId)?.type === "finance"
  );
  const canPmApprove = isOwner || isExecutive || isPmDeptHead;
  const canFinanceApprove = isOwner || isExecutive || isFinanceDeptHead;

  const submitPayment = useSubmitPayment(contractId);
  const reviewPayment = useReviewPayment(contractId);
  const [reviewingPaymentId, setReviewingPaymentId] = useState<string | null>(null);
  const [paymentReviewNote, setPaymentReviewNote] = useState("");

  const [editingMain, setEditingMain] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [vatInclusive, setVatInclusive] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [hasAdvancePayment, setHasAdvancePayment] = useState(false);
  const [advancePct, setAdvancePct] = useState("");
  const [advanceGuaranteeNote, setAdvanceGuaranteeNote] = useState("");
  const [advanceDeductionPct, setAdvanceDeductionPct] = useState("10");
  const [retentionPct, setRetentionPct] = useState("");
  const [retentionReleased, setRetentionReleased] = useState(false);
  const [retentionNote, setRetentionNote] = useState("");
  const [mainError, setMainError] = useState("");

  const [lineDesc, setLineDesc] = useState("");
  const [lineQty, setLineQty] = useState("");
  const [lineUnit, setLineUnit] = useState("");
  const [lineUnitPrice, setLineUnitPrice] = useState("");

  const [payTitle, setPayTitle] = useState("");
  const [payDueDate, setPayDueDate] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payPct, setPayPct] = useState("");
  const [payGuarantee, setPayGuarantee] = useState("");
  const [payIsAdvance, setPayIsAdvance] = useState(false);

  const [violationName, setViolationName] = useState("");
  const [violationAmount, setViolationAmount] = useState("");
  const [violationDesc, setViolationDesc] = useState("");
  const [violationDate, setViolationDate] = useState(new Date().toISOString().slice(0, 10));

  const addLineItem = useAddLineItem(contractId);
  const deleteLineItem = useDeleteLineItem(contractId);
  const addPayment = useAddPayment(contractId);
  const togglePaymentPaid = useTogglePaymentPaid(contractId);
  const deletePayment = useDeletePayment(contractId);
  const addDeduction = useAddDeduction(contractId);
  const deleteDeduction = useDeleteDeduction(contractId);

  const bundle = bundleQuery.data;
  const contract = bundle?.contract;

  // يجب استدعاء كل الـ hooks بلا شرط قبل أي return مبكر — استدعاؤهما سابقاً بعد فحص
  // isLoading أدناه كان يعني عدد hooks مختلف بين أول render (أثناء التحميل) والذي
  // يليه (بعد وصول البيانات)، وهذا يخالف قواعد React ويُسبب خطأ "Rendered more hooks
  // than during the previous render" فعلياً عند أول فتح لأي عقد بلا كاش سابق.
  const extraWorksQuery = useExtraWorks(contract?.id);
  const approverProfilesQuery = useProfilesByIds([
    contract?.submittedBy,
    contract?.pmReviewedBy,
    contract?.financeReviewedBy,
    contract?.settlementSubmittedBy,
    contract?.settlementPmReviewedBy,
    contract?.settlementFinanceReviewedBy,
  ]);

  if (bundleQuery.isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-ink-soft">جارٍ التحميل...</div>;
  }

  const startEditMain = () => {
    if (contract) {
      setName(contract.name);
      setStartDate(contract.startDate ?? "");
      setDurationDays(contract.durationDays?.toString() ?? "");
      setTotalValue(contract.totalValue?.toString() ?? "");
      setVatInclusive(contract.vatInclusive);
      setPaymentTerms(contract.paymentTerms ?? "");
      setHasAdvancePayment(contract.hasAdvancePayment);
      setAdvancePct(contract.advancePaymentPercentage?.toString() ?? "");
      setAdvanceGuaranteeNote(contract.advancePaymentGuaranteeNote ?? "");
      setAdvanceDeductionPct(contract.advanceDeductionPercentage?.toString() ?? "10");
      setRetentionPct(contract.retentionPercentage?.toString() ?? "");
      setRetentionReleased(contract.retentionReleased);
      setRetentionNote(contract.retentionReleaseNote ?? "");
    } else {
      setName("");
      setStartDate("");
      setDurationDays("");
      setTotalValue("");
      setVatInclusive(false);
      setPaymentTerms("");
      setHasAdvancePayment(false);
      setAdvancePct("");
      setAdvanceGuaranteeNote("");
      setAdvanceDeductionPct("10");
      setRetentionPct("");
      setRetentionReleased(false);
      setRetentionNote("");
    }
    setPdfFile(null);
    setMainError("");
    setEditingMain(true);
  };

  const saveMain = async () => {
    setMainError("");
    try {
      const newTotalValue = numOrNull(totalValue);
      const isFirstValue = !!contract && (contract.totalValue == null || contract.totalValue === 0) && !!newTotalValue && newTotalValue > 0;
      const hasLinkedActivity = !!contract && (activitiesQuery.data ?? []).some((a) => a.linkedContractId === contract.id);

      await saveContract.mutateAsync({
        id: contract?.id ?? contractId,
        projectId: projectId!,
        name: name.trim(),
        pdfFile,
        startDate: startDate || null,
        durationDays: numOrNull(durationDays),
        totalValue: newTotalValue,
        vatInclusive,
        vatRate: company.vatRate,
        paymentTerms: paymentTerms || null,
        hasAdvancePayment,
        advancePaymentPercentage: numOrNull(advancePct),
        advancePaymentGuaranteeNote: advanceGuaranteeNote || null,
        advanceDeductionPercentage: numOrNull(advanceDeductionPct),
        retentionPercentage: numOrNull(retentionPct),
        retentionReleased,
        retentionReleaseNote: retentionNote || null,
        resetToDraft: contract?.status === "approved",
      });
      setEditingMain(false);
      if (isFirstValue && !hasLinkedActivity) {
        setOfferDraftActivity({ name: name.trim(), amount: newTotalValue! });
      }
    } catch {
      setMainError("تعذّر حفظ بيانات العقد، حاول مجدداً");
    }
  };

  const handleCreateDraftActivity = async () => {
    if (!offerDraftActivity || !contract || !projectId) return;
    setDraftActivityError("");
    setCreatingDraftActivity(true);
    try {
      const rootOrders = (activitiesQuery.data ?? []).filter((a) => a.parentId === null).map((a) => a.order);
      const nextOrder = rootOrders.length > 0 ? Math.max(...rootOrders) + 1 : 0;
      await createActivity.mutateAsync({
        projectId,
        parentId: null,
        name: offerDraftActivity.name,
        code: null,
        order: nextOrder,
        durationDays: 5,
        startDate: null,
        calendarType: "calendar",
        dependsOn: null,
        depType: null,
        lagDays: 0,
        lagUnit: "day",
        critical: false,
        alertLeadDays: 7,
        requiresReceiving: false,
        scopeType: "project",
        scopeRef: null,
        budgetType: "lumpsum",
        plannedAmount: offerDraftActivity.amount,
        boqQty: null,
        boqUnit: null,
        boqUnitPrice: null,
        linkedContractId: contract.id,
      });
      setOfferDraftActivity(null);
    } catch (err) {
      setDraftActivityError(getErrorMessage(err, "تعذّر إنشاء بند الجدول الزمني، حاول مجدداً"));
    } finally {
      setCreatingDraftActivity(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!contract || !projectId) return;
    await submitContract.mutateAsync({ contractId: contract.id, projectId });
  };

  const handleFinalizeContract = async () => {
    if (!contract || !projectId) return;
    setFinalizeError("");
    setFinalizing(true);
    try {
      await submitContract.mutateAsync({ contractId: contract.id, projectId });
      await reviewContract.mutateAsync({ contractId: contract.id, projectId, approve: true, note: null });
      await reviewContract.mutateAsync({ contractId: contract.id, projectId, approve: true, note: null });
    } catch (err) {
      setFinalizeError(getErrorMessage(err, "تعذّر اعتماد العقد، حاول مجدداً"));
    } finally {
      setFinalizing(false);
    }
  };

  const handleReview = async (approve: boolean) => {
    if (!contract || !projectId) return;
    await reviewContract.mutateAsync({ contractId: contract.id, projectId, approve, note: reviewNoteInput.trim() || null });
    setReviewNoteInput("");
  };

  const handleReviewPayment = async (paymentId: string, approve: boolean) => {
    await reviewPayment.mutateAsync({ paymentId, approve, note: paymentReviewNote.trim() || null });
    setReviewingPaymentId(null);
    setPaymentReviewNote("");
  };

  const handleAddLineItem = async () => {
    if (!contract || !lineDesc.trim()) return;
    await addLineItem.mutateAsync({
      contractId: contract.id,
      description: lineDesc.trim(),
      quantity: numOrNull(lineQty),
      unit: lineUnit || null,
      unitPrice: numOrNull(lineUnitPrice),
      order: bundle?.lineItems.length ?? 0,
    });
    setLineDesc("");
    setLineQty("");
    setLineUnit("");
    setLineUnitPrice("");
  };

  const handleAddPayment = async () => {
    if (!contract || !payTitle.trim()) return;
    await addPayment.mutateAsync({
      contractId: contract.id,
      title: payTitle.trim(),
      dueDate: payDueDate || null,
      amount: numOrNull(payAmount),
      percentage: numOrNull(payPct),
      guaranteeNote: payGuarantee || null,
      order: bundle?.payments.length ?? 0,
      isAdvancePayment: payIsAdvance,
      autoApprove: company.isIndividual,
    });
    setPayTitle("");
    setPayDueDate("");
    setPayAmount("");
    setPayPct("");
    setPayGuarantee("");
    setPayIsAdvance(false);
  };

  const handleAddDeduction = async () => {
    if (!contract || !violationName.trim() || !violationAmount.trim()) return;
    await addDeduction.mutateAsync({
      contractId: contract.id,
      violationName: violationName.trim(),
      deductionAmount: Number(violationAmount) || 0,
      damageDescription: violationDesc || null,
      deductedAt: violationDate,
    });
    setViolationName("");
    setViolationAmount("");
    setViolationDesc("");
  };

  const totalDeductions = (bundle?.deductions ?? []).reduce((sum, d) => sum + d.deductionAmount, 0);

  const approvedExtraWorksTotal = (extraWorksQuery.data ?? [])
    .filter((e) => e.status === "approved")
    .reduce((sum, e) => sum + e.amount, 0);

  const approverProfiles = approverProfilesQuery.data ?? new Map();

  const payments = bundle?.payments ?? [];
  const advancePaymentAmount = payments.find((p) => p.isAdvancePayment)?.amount ?? 0;
  const advanceDeductionPctValue: number = contract?.advanceDeductionPercentage ?? 0;
  const retentionPctValue: number = contract?.retentionPercentage ?? 0;
  const hasAdvancePaymentFlag: boolean = contract?.hasAdvancePayment ?? false;

  const paymentBreakdowns = payments.map((p) => {
    const gross: number = p.amount ?? 0;
    const advanceDeduction = !p.isAdvancePayment && hasAdvancePaymentFlag ? (gross * advanceDeductionPctValue) / 100 : 0;
    const retentionDeduction = !p.isAdvancePayment ? (gross * retentionPctValue) / 100 : 0;
    const net = gross - advanceDeduction - retentionDeduction;
    return { payment: p, gross, advanceDeduction, retentionDeduction, net };
  });

  const totalAdvanceRecouped = paymentBreakdowns.reduce((s, b) => s + b.advanceDeduction, 0);
  const totalRetentionWithheld = paymentBreakdowns.reduce((s, b) => s + b.retentionDeduction, 0);
  const advanceRemaining = Math.max(0, advancePaymentAmount - totalAdvanceRecouped);

  // سجل الضمان الفعلي — فقط المستخلصات المدفوعة فعلاً (وليست كل الجدول المخطط)، لأنها تمثّل
  // مبالغ استُقطعت بالفعل من مبالغ حقيقية تم دفعها.
  const retentionLedger = paymentBreakdowns
    .filter((b) => b.payment.paid && b.retentionDeduction > 0)
    .map((b) => ({ title: b.payment.title, paidDate: b.payment.dueDate, gross: b.gross, retentionAmount: b.retentionDeduction }));

  const handlePrintRetentionCertificate = () => {
    if (!contract) return;
    printRetentionCertificate({
      companyName: company.name,
      projectName: project?.name ?? "",
      contractName: contract.name,
      retentionPercentage: contract.retentionPercentage ?? 0,
      released: contract.retentionReleased,
      releaseNote: contract.retentionReleaseNote,
      ledger: retentionLedger,
      print: company.print,
    });
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-ink truncate">{contract?.name ?? "العقد"}</h1>
        <SecondaryButton onClick={() => navigate(`/projects/${projectId}/contract`)} className="text-sm shrink-0">
          رجوع للعقود
        </SecondaryButton>
      </div>

      {bundleQuery.isLoading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}

      {contract && (
        <Card className="mb-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-soft">حالة الاعتماد:</span>
              <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${STATUS_TONE[contract.status]}`}>
                {STATUS_LABEL[contract.status]}
              </span>
            </div>

            {contract.status === "draft" &&
              (company.isIndividual ? (
                <PrimaryButton onClick={handleFinalizeContract} disabled={finalizing} className="w-auto px-4 py-2 text-xs">
                  {finalizing ? "جارٍ الاعتماد..." : "اعتماد نهائي"}
                </PrimaryButton>
              ) : (
                <PrimaryButton onClick={handleSubmitForApproval} disabled={submitContract.isPending} className="w-auto px-4 py-2 text-xs">
                  {submitContract.isPending ? "جارٍ الإرسال..." : "تقديم للاعتماد"}
                </PrimaryButton>
              ))}
          </div>
          <ErrorText>{finalizeError}</ErrorText>

          {contract.status === "pending_pm_approval" &&
            (canPmApprove ? (
              <div className="mt-3 pt-3 border-t border-line/60">
                <p className="text-xs text-ink-soft mb-2">اعتماد أولي — رئيس قسم إدارة المشاريع</p>
                <TextInput
                  value={reviewNoteInput}
                  onChange={(e) => setReviewNoteInput(e.target.value)}
                  placeholder="ملاحظة الاعتماد/الرفض (اختياري)"
                />
                <div className="flex gap-2 mt-2">
                  <PrimaryButton onClick={() => handleReview(true)} disabled={reviewContract.isPending} className="w-auto px-4 py-2 text-xs">
                    اعتماد وتحويل للمالية
                  </PrimaryButton>
                  <SecondaryButton onClick={() => handleReview(false)} disabled={reviewContract.isPending} className="text-xs px-3 py-2">
                    رفض
                  </SecondaryButton>
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-soft mt-2">بانتظار اعتماد رئيس قسم إدارة المشاريع.</p>
            ))}

          {contract.status === "pending_finance_approval" &&
            (canFinanceApprove ? (
              <div className="mt-3 pt-3 border-t border-line/60">
                <p className="text-xs text-ink-soft mb-2">
                  اعتُمد مبدئياً من إدارة المشاريع — الاعتماد المالي النهائي
                </p>
                <TextInput
                  value={reviewNoteInput}
                  onChange={(e) => setReviewNoteInput(e.target.value)}
                  placeholder="ملاحظة الاعتماد/الرفض (اختياري)"
                />
                <div className="flex gap-2 mt-2">
                  <PrimaryButton onClick={() => handleReview(true)} disabled={reviewContract.isPending} className="w-auto px-4 py-2 text-xs">
                    الاعتماد النهائي
                  </PrimaryButton>
                  <SecondaryButton onClick={() => handleReview(false)} disabled={reviewContract.isPending} className="text-xs px-3 py-2">
                    رفض
                  </SecondaryButton>
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-soft mt-2">اعتُمد مبدئياً من إدارة المشاريع — بانتظار الاعتماد المالي النهائي.</p>
            ))}

          {contract.status === "rejected" && contract.financeReviewNote && (
            <p className="text-xs text-ink-soft mt-2">سبب الرفض (المالية): {contract.financeReviewNote}</p>
          )}
          {contract.status === "rejected" && !contract.financeReviewNote && contract.pmReviewNote && (
            <p className="text-xs text-ink-soft mt-2">سبب الرفض (إدارة المشاريع): {contract.pmReviewNote}</p>
          )}
          {contract.status === "approved" && (
            <div className="mt-3 pt-3 border-t border-line/60 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ApproverBadge
                label="اعتماد إدارة المشاريع"
                userId={contract.pmReviewedBy}
                title={
                  contract.pmReviewedBy
                    ? approverTitle(contract.pmReviewedBy, "project_management", company, departments, members)
                    : ""
                }
                profiles={approverProfiles}
                at={contract.pmReviewedAt}
                note={contract.pmReviewNote}
              />
              <ApproverBadge
                label="الاعتماد المالي النهائي"
                userId={contract.financeReviewedBy}
                title={
                  contract.financeReviewedBy
                    ? approverTitle(contract.financeReviewedBy, "finance", company, departments, members)
                    : ""
                }
                profiles={approverProfiles}
                at={contract.financeReviewedAt}
                note={contract.financeReviewNote}
              />
            </div>
          )}
        </Card>
      )}

      {!editingMain && contract && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-ink">بيانات العقد</h2>
            <SecondaryButton onClick={startEditMain} className="text-xs px-3 py-1.5">
              تعديل
            </SecondaryButton>
          </div>

              {contract.pdfUrl && (
                <a
                  href={contract.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary bg-primary-bg rounded-lg px-3 py-2 mb-4"
                >
                  <FileText size={16} /> عرض نسخة العقد (PDF)
                </a>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <StatCard label="تاريخ البدء" value={contract.startDate ? fmt(contract.startDate) : "—"} />
                <StatCard label="مدة العقد" value={contract.durationDays ? `${contract.durationDays} يوم` : "—"} />
                <StatCard label="قيمة العقد الأصلية" value={contract.totalValue ? fmtMoney(contract.totalValue) : "—"} />
                <StatCard
                  label="إجمالي الخصومات"
                  value={totalDeductions > 0 ? fmtMoney(totalDeductions) : "—"}
                  tone={totalDeductions > 0 ? "critical" : undefined}
                />
              </div>

              {approvedExtraWorksTotal > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <StatCard label="الأعمال الإضافية المعتمدة" value={fmtMoney(approvedExtraWorksTotal)} />
                  <StatCard
                    label="القيمة الإجمالية بعد الإضافات"
                    value={fmtMoney((contract.totalValue ?? 0) + approvedExtraWorksTotal)}
                  />
                </div>
              )}

              {contract.totalValue != null && contract.vatRate != null && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <StatCard
                    label="القيمة بدون الضريبة"
                    value={fmtMoney(computeVat(contract.totalValue, contract.vatInclusive, contract.vatRate).valueExcludingVat)}
                  />
                  <StatCard
                    label={`ضريبة القيمة المضافة (${contract.vatRate}%)`}
                    value={fmtMoney(computeVat(contract.totalValue, contract.vatInclusive, contract.vatRate).vatAmount)}
                  />
                  <StatCard
                    label="القيمة شاملة الضريبة"
                    value={fmtMoney(computeVat(contract.totalValue, contract.vatInclusive, contract.vatRate).valueIncludingVat)}
                  />
                </div>
              )}

              {contract.paymentTerms && (
                <div className="mb-4">
                  <FieldLabel>سياسة الدفعات</FieldLabel>
                  <p className="text-sm text-ink whitespace-pre-wrap bg-bg rounded-lg p-3">{contract.paymentTerms}</p>
                </div>
              )}

              {contract.hasAdvancePayment && (
                <div className="mb-3 bg-bg rounded-lg p-3">
                  <div className="text-xs font-bold text-ink-soft mb-1">دفعة مقدمة</div>
                  <div className="text-sm text-ink">
                    نسبة الدفعة: {contract.advancePaymentPercentage ?? "—"}% — خصم {contract.advanceDeductionPercentage ?? 10}% من كل
                    دفعة لاحقة لتأمين استردادها
                  </div>
                  {contract.advancePaymentGuaranteeNote && (
                    <div className="text-xs text-ink-soft mt-1">ضمان الدفعة: {contract.advancePaymentGuaranteeNote}</div>
                  )}
                </div>
              )}

              {contract.retentionPercentage != null && (
                <div className="bg-bg rounded-lg p-3">
                  <div className="text-xs font-bold text-ink-soft mb-1">ضمان الأعمال (الاستقطاع)</div>
                  <div className="text-sm text-ink">
                    نسبة الاستقطاع: {contract.retentionPercentage}% —{" "}
                    {contract.retentionReleased ? "تم الاسترداد" : "لم تُسترد بعد"}
                  </div>
                  {contract.retentionReleaseNote && (
                    <div className="text-xs text-ink-soft mt-1">{contract.retentionReleaseNote}</div>
                  )}
                </div>
              )}
        </Card>
      )}

      {editingMain && (
        <Card className="mb-6">
          <h2 className="text-sm font-bold text-ink mb-4">تعديل بيانات العقد</h2>

          <div className="mb-4">
            <FieldLabel>اسم العقد</FieldLabel>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: عقد العظم" />
          </div>

          <div className="mb-4">
            <FieldLabel>نسخة العقد (PDF)</FieldLabel>
            <label className="flex items-center gap-2 border border-dashed border-line rounded-lg px-3 py-2.5 cursor-pointer text-sm text-ink-soft hover:bg-bg">
              <Upload size={15} />
              {pdfFile ? pdfFile.name : contract?.pdfUrl ? "استبدال الملف الحالي" : "اختر ملف PDF"}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <FieldLabel>تاريخ بدء العقد</FieldLabel>
              <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <FieldLabel>مدة العقد (بالأيام)</FieldLabel>
              <TextInput type="number" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
            </div>
            <div>
              <FieldLabel>قيمة العقد الإجمالية</FieldLabel>
              <TextInput type="number" value={totalValue} onChange={(e) => setTotalValue(e.target.value)} />
            </div>
          </div>

          <div className="mb-4 bg-bg rounded-lg p-3">
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input type="checkbox" checked={vatInclusive} onChange={(e) => setVatInclusive(e.target.checked)} />
              القيمة المُدخلة شاملة ضريبة القيمة المضافة
            </label>
            <p className="text-xs text-ink-soft mt-1">
              نسبة الضريبة المطبَّقة حالياً: {company.vatRate}% (تُدار من لوحة التحكم). عند عدم تفعيل الخيار، تُعتبر
              القيمة أعلاه غير شاملة الضريبة وتُضاف الضريبة عليها.
            </p>
          </div>

          <div className="mb-4">
            <FieldLabel>سياسة الدفعات</FieldLabel>
            <textarea
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border resize-y"
              placeholder="وصف حر لسياسة الدفعات المتفق عليها"
            />
          </div>

          <div className="mb-4 bg-bg rounded-lg p-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink mb-2 cursor-pointer">
              <input type="checkbox" checked={hasAdvancePayment} onChange={(e) => setHasAdvancePayment(e.target.checked)} />
              يوجد دفعة مقدمة
            </label>
            {hasAdvancePayment && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>نسبة الدفعة المقدمة (%)</FieldLabel>
                  <TextInput type="number" value={advancePct} onChange={(e) => setAdvancePct(e.target.value)} />
                </div>
                <div>
                  <FieldLabel>نسبة الخصم من كل دفعة لاحقة (%)</FieldLabel>
                  <TextInput type="number" value={advanceDeductionPct} onChange={(e) => setAdvanceDeductionPct(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>ضمان الدفعة المقدمة (مثال: سند لأمر بقيمتها)</FieldLabel>
                  <TextInput value={advanceGuaranteeNote} onChange={(e) => setAdvanceGuaranteeNote(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div className="mb-4 bg-bg rounded-lg p-3">
            <div className="text-sm font-semibold text-ink mb-2">ضمان الأعمال (الاستقطاع)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
              <div>
                <FieldLabel>نسبة الاستقطاع (عادة 5 إلى 10%)</FieldLabel>
                <TextInput type="number" value={retentionPct} onChange={(e) => setRetentionPct(e.target.value)} />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-ink cursor-pointer pb-2.5">
                  <input type="checkbox" checked={retentionReleased} onChange={(e) => setRetentionReleased(e.target.checked)} />
                  تم استرداد الاستقطاع
                </label>
              </div>
            </div>
            <FieldLabel>ملاحظة الاسترداد (الضمانات، شهادة الإنجاز، الاعتماد النهائي)</FieldLabel>
            <TextInput value={retentionNote} onChange={(e) => setRetentionNote(e.target.value)} />
          </div>

          <ErrorText>{mainError}</ErrorText>
          <div className="flex gap-2">
            <PrimaryButton onClick={saveMain} disabled={saveContract.isPending} className="w-auto px-5">
              {saveContract.isPending ? "جارٍ الحفظ..." : "حفظ"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setEditingMain(false)} className="px-5">
              إلغاء
            </SecondaryButton>
          </div>
        </Card>
      )}

      {contract && (
        <>
          <Card className="mb-6">
            <h2 className="text-sm font-bold text-ink mb-3">الكميات وسعر الوحدة (إن وجد)</h2>
            {(bundle?.lineItems.length ?? 0) === 0 ? (
              <p className="text-xs text-ink-soft mb-3">لا توجد بنود مسجّلة</p>
            ) : (
              <div className="flex flex-col gap-1.5 mb-3">
                {bundle!.lineItems.map((li) => (
                  <div key={li.id} className="flex items-center justify-between gap-2 text-sm bg-bg rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-ink truncate">{li.description}</div>
                      <div className="text-xs text-ink-soft">
                        {li.quantity ?? "—"} {li.unit ?? ""} × {li.unitPrice ? fmtMoney(li.unitPrice) : "—"}
                      </div>
                    </div>
                    <IconButton icon={Trash2} label="حذف البند" tone="critical" onClick={() => deleteLineItem.mutate(li.id)} />
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <TextInput placeholder="الوصف" value={lineDesc} onChange={(e) => setLineDesc(e.target.value)} className="sm:col-span-1" />
              <TextInput placeholder="الكمية" type="number" value={lineQty} onChange={(e) => setLineQty(e.target.value)} />
              <TextInput placeholder="الوحدة" value={lineUnit} onChange={(e) => setLineUnit(e.target.value)} />
              <TextInput placeholder="سعر الوحدة" type="number" value={lineUnitPrice} onChange={(e) => setLineUnitPrice(e.target.value)} />
            </div>
            <SecondaryButton onClick={handleAddLineItem} disabled={!lineDesc.trim()} className="text-xs mt-2 px-3 py-1.5">
              إضافة بند
            </SecondaryButton>
          </Card>

          <Card className="mb-6">
            <h2 className="text-sm font-bold text-ink mb-3">جدول الدفعات</h2>

            {(contract.hasAdvancePayment || (contract.retentionPercentage ?? 0) > 0) && payments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {contract.hasAdvancePayment && (
                  <>
                    <StatCard label="مُسترد من الدفعة المقدمة" value={fmtMoney(totalAdvanceRecouped)} />
                    <StatCard
                      label="المتبقي من الدفعة المقدمة"
                      value={fmtMoney(advanceRemaining)}
                      tone={advanceRemaining > 0 ? "warn" : undefined}
                    />
                  </>
                )}
                {(contract.retentionPercentage ?? 0) > 0 && (
                  <StatCard label="إجمالي ضمان الأعمال المستقطع" value={fmtMoney(totalRetentionWithheld)} />
                )}
              </div>
            )}

            {paymentBreakdowns.length === 0 ? (
              <p className="text-xs text-ink-soft mb-3">لا توجد دفعات مسجّلة</p>
            ) : (
              <div className="flex flex-col gap-1.5 mb-3">
                {paymentBreakdowns.map(({ payment: p, gross, advanceDeduction, retentionDeduction, net }) => (
                  <div key={p.id} className="bg-bg rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <label className="flex items-center gap-2 min-w-0 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={p.paid}
                          disabled={!p.paid && p.status !== "approved"}
                          title={p.status !== "approved" && !p.paid ? "لازم اعتماد الدفعة أولاً قبل تسجيلها كمدفوعة" : undefined}
                          onChange={(e) => togglePaymentPaid.mutate({ id: p.id, paid: e.target.checked })}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={p.paid ? "text-ink-soft line-through truncate" : "text-ink truncate"}>{p.title}</span>
                            {p.isAdvancePayment && <span className="text-[10px] text-primary">(الدفعة المقدمة)</span>}
                            <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${PAYMENT_STATUS_TONE[p.status]}`}>
                              {PAYMENT_STATUS_LABEL[p.status]}
                            </span>
                          </div>
                          <div className="text-xs text-ink-soft">
                            {p.dueDate ? fmt(p.dueDate) : "بدون موعد"} · إجمالي: {gross ? fmtMoney(gross) : p.percentage ? `${p.percentage}%` : "—"}
                            {p.guaranteeNote ? ` · ${p.guaranteeNote}` : ""}
                          </div>
                          {(advanceDeduction > 0 || retentionDeduction > 0) && (
                            <div className="text-xs mt-1 flex flex-wrap gap-x-3">
                              {retentionDeduction > 0 && (
                                <span className="text-warn">خصم ضمان الأعمال: -{fmtMoney(retentionDeduction)}</span>
                              )}
                              {advanceDeduction > 0 && (
                                <span className="text-warn">خصم استرداد الدفعة المقدمة: -{fmtMoney(advanceDeduction)}</span>
                              )}
                              <span className="text-ink font-semibold">الصافي المستحق: {fmtMoney(net)}</span>
                            </div>
                          )}
                        </div>
                      </label>
                      <div className="flex items-center gap-1 shrink-0">
                        {p.status === "pending" && (
                          <SecondaryButton
                            onClick={() => submitPayment.mutate(p.id)}
                            disabled={submitPayment.isPending}
                            className="text-[11px] px-2 py-1"
                          >
                            تقديم للاعتماد
                          </SecondaryButton>
                        )}
                        {((p.status === "pending_pm_approval" && canPmApprove) ||
                          (p.status === "pending_finance_approval" && canFinanceApprove)) && (
                          <SecondaryButton
                            onClick={() => setReviewingPaymentId(reviewingPaymentId === p.id ? null : p.id)}
                            className="text-[11px] px-2 py-1"
                          >
                            {p.status === "pending_pm_approval" ? "اعتماد أولي" : "الاعتماد المالي النهائي"}
                          </SecondaryButton>
                        )}
                        <IconButton icon={Trash2} label="حذف الدفعة" tone="critical" onClick={() => deletePayment.mutate(p.id)} />
                      </div>
                    </div>

                    {reviewingPaymentId === p.id && (
                      <div className="mt-2 pt-2 border-t border-line/60">
                        <TextInput
                          value={paymentReviewNote}
                          onChange={(e) => setPaymentReviewNote(e.target.value)}
                          placeholder="ملاحظة الاعتماد/الرفض (اختياري)"
                        />
                        <div className="flex gap-2 mt-2">
                          <PrimaryButton
                            onClick={() => handleReviewPayment(p.id, true)}
                            disabled={reviewPayment.isPending}
                            className="w-auto px-3 py-1.5 text-xs"
                          >
                            اعتماد
                          </PrimaryButton>
                          <SecondaryButton
                            onClick={() => handleReviewPayment(p.id, false)}
                            disabled={reviewPayment.isPending}
                            className="text-xs px-3 py-1.5"
                          >
                            رفض
                          </SecondaryButton>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <TextInput placeholder="عنوان الدفعة" value={payTitle} onChange={(e) => setPayTitle(e.target.value)} />
              <TextInput placeholder="الموعد" type="date" value={payDueDate} onChange={(e) => setPayDueDate(e.target.value)} />
              <TextInput placeholder="المبلغ" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              <TextInput placeholder="أو نسبة %" type="number" value={payPct} onChange={(e) => setPayPct(e.target.value)} />
              <TextInput placeholder="ملاحظة ضمان" value={payGuarantee} onChange={(e) => setPayGuarantee(e.target.value)} />
            </div>
            {contract.hasAdvancePayment && (
              <label className="flex items-center gap-2 text-xs text-ink-soft mt-2 cursor-pointer">
                <input type="checkbox" checked={payIsAdvance} onChange={(e) => setPayIsAdvance(e.target.checked)} />
                هذه الدفعة هي الدفعة المقدمة نفسها (تُستثنى من خصومات الاسترداد والاستقطاع)
              </label>
            )}
            <SecondaryButton onClick={handleAddPayment} disabled={!payTitle.trim()} className="text-xs mt-2 px-3 py-1.5">
              إضافة دفعة
            </SecondaryButton>
          </Card>

          <ExtraWorksSection
            contractId={contract.id}
            canPmApprove={canPmApprove}
            canFinanceApprove={canFinanceApprove}
            isIndividual={company.isIndividual}
          />

          {contract.retentionPercentage != null && (
            <Card className="mb-6">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-sm font-bold text-ink">سجل ضمان الأعمال (الاستقطاع)</h2>
                <SecondaryButton onClick={handlePrintRetentionCertificate} className="text-xs px-3 py-1.5">
                  طباعة شهادة الضمان
                </SecondaryButton>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                <StatCard label="نسبة الاستقطاع" value={`${contract.retentionPercentage}%`} />
                <StatCard label="إجمالي المستقطع" value={fmtMoney(totalRetentionWithheld)} />
                <StatCard
                  label="حالة الاسترداد"
                  value={contract.retentionReleased ? "تم الاسترداد" : "قيد الاستقطاع"}
                  tone={contract.retentionReleased ? undefined : "warn"}
                />
              </div>
              {retentionLedger.length === 0 ? (
                <p className="text-xs text-ink-soft">لا توجد مستخلصات مدفوعة بعد لعرضها بالسجل</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {retentionLedger.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-bg rounded-lg px-3 py-2">
                      <span className="text-ink">{r.title}</span>
                      <span className="text-ink-soft font-mono">-{fmtMoney(r.retentionAmount)}</span>
                    </div>
                  ))}
                </div>
              )}
              {contract.retentionReleaseNote && (
                <p className="text-xs text-ink-soft mt-2">ملاحظة الاسترداد: {contract.retentionReleaseNote}</p>
              )}
            </Card>
          )}

          <SettlementSection
            contract={contract}
            projectName={project?.name ?? ""}
            company={company}
            departments={departments}
            members={members}
            canPmApprove={canPmApprove}
            canFinanceApprove={canFinanceApprove}
            originalValue={contract.totalValue ?? 0}
            approvedExtraWorksTotal={approvedExtraWorksTotal}
            totalDeductions={totalDeductions}
            retentionHeld={totalRetentionWithheld}
            totalPaidNet={paymentBreakdowns.filter((b) => b.payment.paid).reduce((s, b) => s + b.net, 0)}
            isIndividual={company.isIndividual}
          />

          <Card>
            <h2 className="text-sm font-bold text-ink mb-3">خصومات على المقاول (مخالفات)</h2>
            {(bundle?.deductions.length ?? 0) === 0 ? (
              <p className="text-xs text-ink-soft mb-3">لا توجد خصومات مسجّلة</p>
            ) : (
              <div className="flex flex-col gap-1.5 mb-3">
                {bundle!.deductions.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 text-sm bg-critical-bg rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-ink truncate">
                        {d.violationName} — <span className="text-critical font-bold">{fmtMoney(d.deductionAmount)}</span>
                      </div>
                      <div className="text-xs text-ink-soft">
                        {fmt(d.deductedAt)}
                        {d.damageDescription ? ` · ${d.damageDescription}` : ""}
                      </div>
                    </div>
                    <IconButton icon={Trash2} label="حذف الخصم" tone="critical" onClick={() => deleteDeduction.mutate(d.id)} />
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <TextInput placeholder="اسم المخالفة" value={violationName} onChange={(e) => setViolationName(e.target.value)} />
              <TextInput placeholder="قيمة الخصم" type="number" value={violationAmount} onChange={(e) => setViolationAmount(e.target.value)} />
              <TextInput placeholder="الضرر الناتج" value={violationDesc} onChange={(e) => setViolationDesc(e.target.value)} />
              <TextInput type="date" value={violationDate} onChange={(e) => setViolationDate(e.target.value)} />
            </div>
            <SecondaryButton
              onClick={handleAddDeduction}
              disabled={!violationName.trim() || !violationAmount.trim()}
              className="text-xs mt-2 px-3 py-1.5"
            >
              إضافة خصم
            </SecondaryButton>
          </Card>

          <RecordAuditTimeline tableName="contracts" recordId={contract.id} />
        </>
      )}

      {offerDraftActivity && (
        <Modal title="ربط بالجدول الزمني" onClose={() => setOfferDraftActivity(null)}>
          <p className="text-sm text-ink-soft mb-4">
            لا يوجد بند بالجدول الزمني مرتبط بهذا العقد — هل تريد إنشاء بند مسودة بنفس الاسم والقيمة (
            {fmtMoney(offerDraftActivity.amount)}) لمتابعته لاحقاً؟ يمكنك إكمال تفاصيله (المدة، التبعيات...) من الجدول الزمني في أي
            وقت.
          </p>
          <ErrorText>{draftActivityError}</ErrorText>
          <div className="flex gap-2">
            <PrimaryButton onClick={handleCreateDraftActivity} disabled={creatingDraftActivity} className="flex-1">
              {creatingDraftActivity ? "جارٍ الإنشاء..." : "إنشاء بند مسودة"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setOfferDraftActivity(null)} className="flex-1">
              لا، شكراً
            </SecondaryButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
