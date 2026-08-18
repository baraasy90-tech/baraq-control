import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, StatCard, SecondaryButton, PrimaryButton, FieldLabel, TextInput, ErrorText } from "@/components/ui";
import { useMaterialRequest } from "@/features/procurement/api/useMaterialRequests";
import { useSaveSampleDetails, useSavePurchaseDetails } from "@/features/procurement/api/useSaveMaterialRequest";
import {
  useSubmitMaterialSample,
  useReviewMaterialSample,
  useSubmitMaterialPurchase,
  useReviewMaterialPurchase,
} from "@/features/procurement/api/useMaterialApproval";
import { useCompany } from "@/features/company/useCompany";
import { useDepartments } from "@/features/company/api/useDepartments";
import { useDepartmentMembers } from "@/features/company/api/useDepartmentMembers";
import { fmtMoney } from "@/utils/money";
import { fmt } from "@/utils/dates";
import { MATERIAL_STATUS_LABEL, MATERIAL_STATUS_TONE } from "@/features/procurement/statusLabels";

function numOrNull(v: string): number | null {
  const n = Number(v);
  return v.trim() === "" || Number.isNaN(n) ? null : n;
}

export function MaterialRequestScreen() {
  const { id: projectId, requestId } = useParams<{ id: string; requestId: string }>();
  const navigate = useNavigate();
  const requestQuery = useMaterialRequest(requestId);

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
    (m) => m.userId === profile.id && m.role === "head" && departments.find((d) => d.id === m.departmentId)?.type === "finance"
  );
  const canPmApprove = isOwner || isExecutive || isPmDeptHead;
  const canExecutiveApprove = isOwner || isExecutive;
  const canFinanceApprove = isOwner || isExecutive || isFinanceDeptHead;

  const saveSampleDetails = useSaveSampleDetails();
  const savePurchaseDetails = useSavePurchaseDetails();
  const submitSample = useSubmitMaterialSample(projectId);
  const reviewSample = useReviewMaterialSample(projectId);
  const submitPurchase = useSubmitMaterialPurchase(projectId);
  const reviewPurchase = useReviewMaterialPurchase(projectId);

  const [editingSample, setEditingSample] = useState(false);
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [samplePrice, setSamplePrice] = useState("");
  const [sampleReceivedAt, setSampleReceivedAt] = useState("");
  const [sampleError, setSampleError] = useState("");
  const [sampleReviewNote, setSampleReviewNote] = useState("");

  const [editingPurchase, setEditingPurchase] = useState(false);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteReceivedAt, setQuoteReceivedAt] = useState("");
  const [attachmentsNote, setAttachmentsNote] = useState("");
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseReviewNote, setPurchaseReviewNote] = useState("");

  if (requestQuery.isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-ink-soft">جارٍ التحميل...</div>;
  }

  const request = requestQuery.data;
  if (!request) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-sm text-ink-soft">
        <p>تعذّر العثور على الطلب</p>
        <SecondaryButton onClick={() => navigate(`/projects/${projectId}/materials`)}>رجوع لطلبات المواد</SecondaryButton>
      </div>
    );
  }

  const canEditSample = request.status === "draft" || request.status === "sample_rejected";
  const canEditPurchase = request.status === "sample_approved" || request.status === "purchase_rejected";

  const startEditSample = () => {
    setItemName(request.itemName);
    setDescription(request.description ?? "");
    setSamplePrice(request.samplePrice?.toString() ?? "");
    setSampleReceivedAt(request.sampleReceivedAt ?? "");
    setSampleError("");
    setEditingSample(true);
  };

  const saveSample = async () => {
    if (!itemName.trim()) return;
    setSampleError("");
    try {
      await saveSampleDetails.mutateAsync({
        requestId: request.id,
        projectId: request.projectId,
        itemName: itemName.trim(),
        description: description.trim() || null,
        samplePrice: numOrNull(samplePrice),
        sampleReceivedAt: sampleReceivedAt || null,
      });
      setEditingSample(false);
    } catch {
      setSampleError("تعذّر حفظ بيانات العينة، حاول مجدداً");
    }
  };

  const handleSubmitSample = async () => {
    setSampleError("");
    try {
      await submitSample.mutateAsync(request.id);
    } catch {
      setSampleError("تعذّر تقديم العينة للاعتماد، تأكد من إدخال السعر");
    }
  };

  const handleReviewSample = async (approve: boolean) => {
    await reviewSample.mutateAsync({ requestId: request.id, approve, note: sampleReviewNote.trim() || null });
    setSampleReviewNote("");
  };

  const startEditPurchase = () => {
    setQuotePrice(request.quotePrice?.toString() ?? "");
    setQuoteReceivedAt(request.quoteReceivedAt ?? "");
    setAttachmentsNote(request.attachmentsNote ?? "");
    setPurchaseError("");
    setEditingPurchase(true);
  };

  const savePurchase = async () => {
    setPurchaseError("");
    try {
      await savePurchaseDetails.mutateAsync({
        requestId: request.id,
        projectId: request.projectId,
        quotePrice: numOrNull(quotePrice),
        quoteReceivedAt: quoteReceivedAt || null,
        attachmentsNote: attachmentsNote.trim() || null,
      });
      setEditingPurchase(false);
    } catch {
      setPurchaseError("تعذّر حفظ بيانات عرض السعر، حاول مجدداً");
    }
  };

  const handleSubmitPurchase = async () => {
    setPurchaseError("");
    try {
      await submitPurchase.mutateAsync(request.id);
    } catch {
      setPurchaseError("تعذّر تقديم طلب الشراء للاعتماد، تأكد من إدخال سعر عرض السعر");
    }
  };

  const handleReviewPurchase = async (approve: boolean) => {
    await reviewPurchase.mutateAsync({ requestId: request.id, approve, note: purchaseReviewNote.trim() || null });
    setPurchaseReviewNote("");
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-ink truncate">{request.itemName}</h1>
        <SecondaryButton onClick={() => navigate(`/projects/${projectId}/materials`)} className="text-sm shrink-0">
          رجوع لطلبات المواد
        </SecondaryButton>
      </div>

      <Card className="mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-soft">حالة الاعتماد:</span>
          <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${MATERIAL_STATUS_TONE[request.status]}`}>
            {MATERIAL_STATUS_LABEL[request.status]}
          </span>
        </div>
      </Card>

      {/* ===== المرحلة 1: العينة ===== */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-ink">المرحلة 1 — طلب العينة</h2>
          {canEditSample && !editingSample && (
            <SecondaryButton onClick={startEditSample} className="text-xs px-3 py-1.5">
              تعديل
            </SecondaryButton>
          )}
        </div>

        {!editingSample ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              <StatCard label="سعر العينة" value={request.samplePrice ? fmtMoney(request.samplePrice) : "—"} />
              <StatCard label="تاريخ استلام العينة" value={request.sampleReceivedAt ? fmt(request.sampleReceivedAt) : "—"} />
            </div>
            {request.description && <p className="text-sm text-ink-soft whitespace-pre-wrap mb-3">{request.description}</p>}

            {canEditSample && (
              <PrimaryButton onClick={handleSubmitSample} disabled={submitSample.isPending} className="w-auto px-4 py-2 text-xs">
                {submitSample.isPending ? "جارٍ الإرسال..." : "تقديم العينة للاعتماد"}
              </PrimaryButton>
            )}
            <ErrorText>{sampleError}</ErrorText>

            {request.status === "sample_pending_pm_approval" &&
              (canPmApprove ? (
                <div className="mt-3 pt-3 border-t border-line/60">
                  <p className="text-xs text-ink-soft mb-2">اعتماد أولي — رئيس قسم إدارة المشاريع</p>
                  <TextInput
                    value={sampleReviewNote}
                    onChange={(e) => setSampleReviewNote(e.target.value)}
                    placeholder="ملاحظة الاعتماد/الرفض (اختياري)"
                  />
                  <div className="flex gap-2 mt-2">
                    <PrimaryButton
                      onClick={() => handleReviewSample(true)}
                      disabled={reviewSample.isPending}
                      className="w-auto px-4 py-2 text-xs"
                    >
                      اعتماد وتحويل للإدارة التنفيذية
                    </PrimaryButton>
                    <SecondaryButton onClick={() => handleReviewSample(false)} disabled={reviewSample.isPending} className="text-xs px-3 py-2">
                      رفض
                    </SecondaryButton>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-ink-soft mt-2">بانتظار اعتماد رئيس قسم إدارة المشاريع.</p>
              ))}

            {request.status === "sample_pending_executive_approval" &&
              (canExecutiveApprove ? (
                <div className="mt-3 pt-3 border-t border-line/60">
                  <p className="text-xs text-ink-soft mb-2">اعتُمدت مبدئياً من إدارة المشاريع — اعتماد الإدارة التنفيذية</p>
                  <TextInput
                    value={sampleReviewNote}
                    onChange={(e) => setSampleReviewNote(e.target.value)}
                    placeholder="ملاحظة الاعتماد/الرفض (اختياري)"
                  />
                  <div className="flex gap-2 mt-2">
                    <PrimaryButton
                      onClick={() => handleReviewSample(true)}
                      disabled={reviewSample.isPending}
                      className="w-auto px-4 py-2 text-xs"
                    >
                      اعتماد العينة نهائياً
                    </PrimaryButton>
                    <SecondaryButton onClick={() => handleReviewSample(false)} disabled={reviewSample.isPending} className="text-xs px-3 py-2">
                      رفض
                    </SecondaryButton>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-ink-soft mt-2">اعتُمدت مبدئياً من إدارة المشاريع — بانتظار اعتماد الإدارة التنفيذية.</p>
              ))}

            {request.status === "sample_rejected" && (
              <p className="text-xs text-critical mt-2">
                سبب الرفض: {request.sampleExecutiveReviewNote || request.samplePmReviewNote || "بدون سبب"}
              </p>
            )}
            {(request.status === "sample_approved" || request.status.startsWith("purchase_")) && (
              <div className="text-xs text-ink-soft mt-2">
                {request.samplePmReviewNote && <p>ملاحظة إدارة المشاريع: {request.samplePmReviewNote}</p>}
                {request.sampleExecutiveReviewNote && <p>ملاحظة الإدارة التنفيذية: {request.sampleExecutiveReviewNote}</p>}
              </div>
            )}
          </>
        ) : (
          <div>
            <div className="mb-3">
              <FieldLabel>اسم المادة/المنتج</FieldLabel>
              <TextInput value={itemName} onChange={(e) => setItemName(e.target.value)} />
            </div>
            <div className="mb-3">
              <FieldLabel>وصف/تفاصيل العينة</FieldLabel>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border resize-y"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <FieldLabel>سعر العينة</FieldLabel>
                <TextInput type="number" value={samplePrice} onChange={(e) => setSamplePrice(e.target.value)} />
              </div>
              <div>
                <FieldLabel>تاريخ استلام العينة</FieldLabel>
                <TextInput type="date" value={sampleReceivedAt} onChange={(e) => setSampleReceivedAt(e.target.value)} />
              </div>
            </div>
            <ErrorText>{sampleError}</ErrorText>
            <div className="flex gap-2">
              <PrimaryButton onClick={saveSample} disabled={saveSampleDetails.isPending || !itemName.trim()} className="w-auto px-5">
                {saveSampleDetails.isPending ? "جارٍ الحفظ..." : "حفظ"}
              </PrimaryButton>
              <SecondaryButton onClick={() => setEditingSample(false)} className="px-5">
                إلغاء
              </SecondaryButton>
            </div>
          </div>
        )}
      </Card>

      {/* ===== المرحلة 2: الشراء الرسمي ===== */}
      {(request.status === "sample_approved" || request.status.startsWith("purchase_")) && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-ink">المرحلة 2 — الشراء الرسمي</h2>
            {canEditPurchase && !editingPurchase && (
              <SecondaryButton onClick={startEditPurchase} className="text-xs px-3 py-1.5">
                تعديل
              </SecondaryButton>
            )}
          </div>

          {!editingPurchase ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                <StatCard label="سعر عرض السعر" value={request.quotePrice ? fmtMoney(request.quotePrice) : "—"} />
                <StatCard label="تاريخ استلام عرض السعر" value={request.quoteReceivedAt ? fmt(request.quoteReceivedAt) : "—"} />
              </div>
              {request.attachmentsNote && (
                <div className="mb-3">
                  <FieldLabel>مرفقات خاصة مطلوبة</FieldLabel>
                  <p className="text-sm text-ink whitespace-pre-wrap bg-bg rounded-lg p-3">{request.attachmentsNote}</p>
                </div>
              )}

              {canEditPurchase && (
                <PrimaryButton onClick={handleSubmitPurchase} disabled={submitPurchase.isPending} className="w-auto px-4 py-2 text-xs">
                  {submitPurchase.isPending ? "جارٍ الإرسال..." : "تقديم طلب الشراء للاعتماد"}
                </PrimaryButton>
              )}
              <ErrorText>{purchaseError}</ErrorText>

              {request.status === "purchase_pending_pm_approval" &&
                (canPmApprove ? (
                  <div className="mt-3 pt-3 border-t border-line/60">
                    <p className="text-xs text-ink-soft mb-2">اعتماد أولي لقيمة الشراء — رئيس قسم إدارة المشاريع</p>
                    <TextInput
                      value={purchaseReviewNote}
                      onChange={(e) => setPurchaseReviewNote(e.target.value)}
                      placeholder="ملاحظة الاعتماد/الرفض (اختياري)"
                    />
                    <div className="flex gap-2 mt-2">
                      <PrimaryButton
                        onClick={() => handleReviewPurchase(true)}
                        disabled={reviewPurchase.isPending}
                        className="w-auto px-4 py-2 text-xs"
                      >
                        اعتماد وتحويل للمالية
                      </PrimaryButton>
                      <SecondaryButton
                        onClick={() => handleReviewPurchase(false)}
                        disabled={reviewPurchase.isPending}
                        className="text-xs px-3 py-2"
                      >
                        رفض
                      </SecondaryButton>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-ink-soft mt-2">بانتظار اعتماد رئيس قسم إدارة المشاريع.</p>
                ))}

              {request.status === "purchase_pending_finance_approval" &&
                (canFinanceApprove ? (
                  <div className="mt-3 pt-3 border-t border-line/60">
                    <p className="text-xs text-ink-soft mb-2">اعتُمدت مبدئياً من إدارة المشاريع — الاعتماد المالي للصرف</p>
                    <TextInput
                      value={purchaseReviewNote}
                      onChange={(e) => setPurchaseReviewNote(e.target.value)}
                      placeholder="ملاحظة الاعتماد/الرفض (اختياري)"
                    />
                    <div className="flex gap-2 mt-2">
                      <PrimaryButton
                        onClick={() => handleReviewPurchase(true)}
                        disabled={reviewPurchase.isPending}
                        className="w-auto px-4 py-2 text-xs"
                      >
                        الاعتماد النهائي للصرف
                      </PrimaryButton>
                      <SecondaryButton
                        onClick={() => handleReviewPurchase(false)}
                        disabled={reviewPurchase.isPending}
                        className="text-xs px-3 py-2"
                      >
                        رفض
                      </SecondaryButton>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-ink-soft mt-2">اعتُمدت مبدئياً من إدارة المشاريع — بانتظار الاعتماد المالي للصرف.</p>
                ))}

              {request.status === "purchase_rejected" && (
                <p className="text-xs text-critical mt-2">
                  سبب الرفض: {request.purchaseFinanceReviewNote || request.purchasePmReviewNote || "بدون سبب"}
                </p>
              )}
              {request.status === "purchase_approved" && (
                <div className="text-xs text-ink-soft mt-2">
                  {request.purchasePmReviewNote && <p>ملاحظة إدارة المشاريع: {request.purchasePmReviewNote}</p>}
                  {request.purchaseFinanceReviewNote && <p>ملاحظة المالية: {request.purchaseFinanceReviewNote}</p>}
                </div>
              )}
            </>
          ) : (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <FieldLabel>سعر عرض السعر</FieldLabel>
                  <TextInput type="number" value={quotePrice} onChange={(e) => setQuotePrice(e.target.value)} />
                </div>
                <div>
                  <FieldLabel>تاريخ استلام عرض السعر</FieldLabel>
                  <TextInput type="date" value={quoteReceivedAt} onChange={(e) => setQuoteReceivedAt(e.target.value)} />
                </div>
              </div>
              <div className="mb-4">
                <FieldLabel>مرفقات خاصة مطلوبة (إن وجدت)</FieldLabel>
                <textarea
                  value={attachmentsNote}
                  onChange={(e) => setAttachmentsNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border resize-y"
                  placeholder="مثال: شهادة مطابقة، عينة موقّعة من الاستشاري..."
                />
              </div>
              <ErrorText>{purchaseError}</ErrorText>
              <div className="flex gap-2">
                <PrimaryButton onClick={savePurchase} disabled={savePurchaseDetails.isPending} className="w-auto px-5">
                  {savePurchaseDetails.isPending ? "جارٍ الحفظ..." : "حفظ"}
                </PrimaryButton>
                <SecondaryButton onClick={() => setEditingPurchase(false)} className="px-5">
                  إلغاء
                </SecondaryButton>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
