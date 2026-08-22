import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, StatCard, SecondaryButton, PrimaryButton, FieldLabel, TextInput, ErrorText } from "@/components/ui";
import { useMaterialRequest } from "@/features/procurement/api/useMaterialRequests";
import { useSavePurchaseDetails } from "@/features/procurement/api/useSaveMaterialRequest";
import { useApprovalChains } from "@/features/procurement/api/useApprovalChains";
import { ApprovalChainSection } from "@/features/procurement/ApprovalChainSection";
import { SourcingSection } from "@/features/procurement/SourcingSection";
import { useCompany } from "@/features/company/useCompany";
import { useDepartments } from "@/features/company/api/useDepartments";
import { useDepartmentMembers } from "@/features/company/api/useDepartmentMembers";
import { useProfilesByIds } from "@/features/company/api/useProfilesByIds";
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
  const chainsQuery = useApprovalChains(requestId);

  const { company, profile } = useCompany();
  const departmentsQuery = useDepartments(company.id);
  const allDepartments = departmentsQuery.data ?? [];
  const rootDepartments = allDepartments.filter((d) => !d.parentDepartmentId);
  const membersQuery = useDepartmentMembers(allDepartments.map((d) => d.id));
  const members = membersQuery.data ?? [];
  const isOwner = company.createdBy === profile.id;
  const isExecutive = members.some(
    (m) => m.userId === profile.id && allDepartments.find((d) => d.id === m.departmentId)?.type === "executive"
  );
  const isOrgManager = isOwner || isExecutive;

  const bundles = chainsQuery.data ?? [];
  const allUserIds = bundles.flatMap((b) => b.steps.flatMap((s) => [s.assignedUserId, s.actedBy, s.routedBy, s.insertedBy]));
  const profilesQuery = useProfilesByIds(allUserIds);
  const profilesById = profilesQuery.data ?? new Map();

  const savePurchaseDetails = useSavePurchaseDetails();

  const [editingPurchase, setEditingPurchase] = useState(false);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteReceivedAt, setQuoteReceivedAt] = useState("");
  const [attachmentsNote, setAttachmentsNote] = useState("");
  const [purchaseError, setPurchaseError] = useState("");

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

  const canEditPurchaseFields = request.status === "sample_approved" || request.status === "purchase_rejected";
  const showPurchasePhase = request.status === "sample_approved" || request.status.startsWith("purchase_");

  const sampleBundles = bundles.filter((b) => b.chain.phase === "sample");
  const purchaseBundles = bundles.filter((b) => b.chain.phase === "purchase");

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
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : "تعذّر حفظ بيانات عرض السعر، حاول مجدداً");
    }
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

      {/* ===== المرحلة 1: طلب مادة من المشتريات ===== */}
      <Card className="mb-6">
        <SourcingSection
          request={request}
          chainBundle={sampleBundles.length > 0 ? sampleBundles[sampleBundles.length - 1] : null}
          currentUserId={profile.id}
          isOrgManager={isOrgManager}
          departments={rootDepartments}
          members={members}
          profilesById={profilesById}
        />
      </Card>

      {/* ===== المرحلة 2: الشراء الرسمي ===== */}
      {showPurchasePhase && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-ink">المرحلة 2 — الشراء الرسمي</h2>
            {canEditPurchaseFields && !editingPurchase && (
              <SecondaryButton onClick={startEditPurchase} className="text-xs px-3 py-1.5">
                تعديل بيانات الشراء
              </SecondaryButton>
            )}
          </div>

          {!editingPurchase ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <StatCard label="سعر عرض السعر" value={request.quotePrice ? fmtMoney(request.quotePrice) : "—"} />
                <StatCard label="تاريخ استلام عرض السعر" value={request.quoteReceivedAt ? fmt(request.quoteReceivedAt) : "—"} />
              </div>
              {request.attachmentsNote && (
                <div className="mb-4">
                  <FieldLabel>مرفقات خاصة مطلوبة</FieldLabel>
                  <p className="text-sm text-ink whitespace-pre-wrap bg-bg rounded-lg p-3">{request.attachmentsNote}</p>
                </div>
              )}

              <ApprovalChainSection
                title="سلسلة اعتماد قيمة الشراء"
                requestId={request.id}
                projectId={request.projectId}
                canEdit={canEditPurchaseFields}
                priceEntered={request.quotePrice != null}
                bundles={purchaseBundles}
                currentUserId={profile.id}
                departments={rootDepartments}
                members={members}
                profilesById={profilesById}
                isOrgManager={isOrgManager}
              />
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
