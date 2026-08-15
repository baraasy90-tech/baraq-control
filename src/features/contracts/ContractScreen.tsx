import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FileText, Trash2, Plus, Upload } from "lucide-react";
import { Card, StatCard, SecondaryButton, PrimaryButton, IconButton, FieldLabel, TextInput, ErrorText } from "@/components/ui";
import { useContract } from "@/features/contracts/api/useContract";
import { useSaveContract } from "@/features/contracts/api/useSaveContract";
import {
  useAddLineItem,
  useDeleteLineItem,
  useAddPayment,
  useTogglePaymentPaid,
  useDeletePayment,
  useAddDeduction,
  useDeleteDeduction,
} from "@/features/contracts/api/useContractItems";
import { fmtMoney } from "@/utils/money";
import { fmt } from "@/utils/dates";
import { useActivities } from "@/features/schedule/api/useActivities";
import { getPlannedAmount } from "@/features/budget/lib/budget";
import { BudgetVarianceBanner } from "@/features/budget/BudgetVarianceBanner";

function numOrNull(v: string): number | null {
  const n = Number(v);
  return v.trim() === "" || Number.isNaN(n) ? null : n;
}

export function ContractScreen() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const bundleQuery = useContract(projectId);
  const activitiesQuery = useActivities(projectId);
  const saveContract = useSaveContract();

  const [editingMain, setEditingMain] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [startDate, setStartDate] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [totalValue, setTotalValue] = useState("");
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

  const addLineItem = useAddLineItem(projectId);
  const deleteLineItem = useDeleteLineItem(projectId);
  const addPayment = useAddPayment(projectId);
  const togglePaymentPaid = useTogglePaymentPaid(projectId);
  const deletePayment = useDeletePayment(projectId);
  const addDeduction = useAddDeduction(projectId);
  const deleteDeduction = useDeleteDeduction(projectId);

  if (bundleQuery.isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-ink-soft">جارٍ التحميل...</div>;
  }

  const bundle = bundleQuery.data;
  const contract = bundle?.contract;

  const startEditMain = () => {
    if (contract) {
      setStartDate(contract.startDate ?? "");
      setDurationDays(contract.durationDays?.toString() ?? "");
      setTotalValue(contract.totalValue?.toString() ?? "");
      setPaymentTerms(contract.paymentTerms ?? "");
      setHasAdvancePayment(contract.hasAdvancePayment);
      setAdvancePct(contract.advancePaymentPercentage?.toString() ?? "");
      setAdvanceGuaranteeNote(contract.advancePaymentGuaranteeNote ?? "");
      setAdvanceDeductionPct(contract.advanceDeductionPercentage?.toString() ?? "10");
      setRetentionPct(contract.retentionPercentage?.toString() ?? "");
      setRetentionReleased(contract.retentionReleased);
      setRetentionNote(contract.retentionReleaseNote ?? "");
    } else {
      setStartDate("");
      setDurationDays("");
      setTotalValue("");
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
      await saveContract.mutateAsync({
        id: contract?.id,
        projectId: projectId!,
        pdfFile,
        startDate: startDate || null,
        durationDays: numOrNull(durationDays),
        totalValue: numOrNull(totalValue),
        paymentTerms: paymentTerms || null,
        hasAdvancePayment,
        advancePaymentPercentage: numOrNull(advancePct),
        advancePaymentGuaranteeNote: advanceGuaranteeNote || null,
        advanceDeductionPercentage: numOrNull(advanceDeductionPct),
        retentionPercentage: numOrNull(retentionPct),
        retentionReleased,
        retentionReleaseNote: retentionNote || null,
      });
      setEditingMain(false);
    } catch {
      setMainError("تعذّر حفظ بيانات العقد، حاول مجدداً");
    }
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

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-ink">العقد</h1>
        <SecondaryButton onClick={() => navigate(`/projects/${projectId}`)} className="text-sm">
          رجوع للمشروع
        </SecondaryButton>
      </div>

      {contract && (
        <BudgetVarianceBanner
          projectId={projectId!}
          contractValue={contract.totalValue}
          trackedBudget={(activitiesQuery.data ?? []).reduce((sum, a) => sum + getPlannedAmount(a), 0)}
        />
      )}

      {!editingMain && (
        <Card className="mb-6">
          {!contract ? (
            <div className="text-center py-6">
              <p className="text-sm text-ink-soft mb-4">لم يُسجّل عقد لهذا المشروع بعد</p>
              <PrimaryButton onClick={startEditMain} className="w-auto px-5 inline-flex items-center gap-1.5">
                <Plus size={15} strokeWidth={2.5} /> إضافة العقد
              </PrimaryButton>
            </div>
          ) : (
            <>
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
                <StatCard label="قيمة العقد" value={contract.totalValue ? fmtMoney(contract.totalValue) : "—"} />
                <StatCard
                  label="إجمالي الخصومات"
                  value={totalDeductions > 0 ? fmtMoney(totalDeductions) : "—"}
                  tone={totalDeductions > 0 ? "critical" : undefined}
                />
              </div>

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
            </>
          )}
        </Card>
      )}

      {editingMain && (
        <Card className="mb-6">
          <h2 className="text-sm font-bold text-ink mb-4">{contract ? "تعديل بيانات العقد" : "إضافة العقد"}</h2>

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
                  <div key={p.id} className="flex items-center justify-between gap-2 text-sm bg-bg rounded-lg px-3 py-2">
                    <label className="flex items-center gap-2 min-w-0 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={p.paid}
                        onChange={(e) => togglePaymentPaid.mutate({ id: p.id, paid: e.target.checked })}
                      />
                      <div className="min-w-0 flex-1">
                        <div className={p.paid ? "text-ink-soft line-through truncate" : "text-ink truncate"}>
                          {p.title} {p.isAdvancePayment && <span className="text-[10px] text-primary">(الدفعة المقدمة)</span>}
                        </div>
                        <div className="text-xs text-ink-soft">
                          {p.dueDate ? fmt(p.dueDate) : "بدون موعد"} · إجمالي: {gross ? fmtMoney(gross) : p.percentage ? `${p.percentage}%` : "—"}
                          {p.guaranteeNote ? ` · ${p.guaranteeNote}` : ""}
                        </div>
                        {(advanceDeduction > 0 || retentionDeduction > 0) && (
                          <div className="text-xs mt-1 flex flex-wrap gap-x-3">
                            {advanceDeduction > 0 && (
                              <span className="text-warn">خصم استرداد الدفعة المقدمة: -{fmtMoney(advanceDeduction)}</span>
                            )}
                            {retentionDeduction > 0 && (
                              <span className="text-warn">خصم ضمان الأعمال: -{fmtMoney(retentionDeduction)}</span>
                            )}
                            <span className="text-ink font-semibold">الصافي المستحق: {fmtMoney(net)}</span>
                          </div>
                        )}
                      </div>
                    </label>
                    <IconButton icon={Trash2} label="حذف الدفعة" tone="critical" onClick={() => deletePayment.mutate(p.id)} />
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
        </>
      )}
    </div>
  );
}
