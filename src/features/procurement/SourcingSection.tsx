import { useState } from "react";
import { Paperclip, Trash2, Upload } from "lucide-react";
import { StatCard, SecondaryButton, PrimaryButton, IconButton, FieldLabel, TextInput, ErrorText } from "@/components/ui";
import { ApprovalStepsList } from "@/features/procurement/ApprovalChainSection";
import { useSaveSourcingDetails } from "@/features/procurement/api/useSaveMaterialRequest";
import { useSubmitMaterialSourcing } from "@/features/procurement/api/useApprovalChainActions";
import { useMaterialOptions, useAddMaterialOption, useDeleteMaterialOption } from "@/features/procurement/api/useMaterialOptions";
import {
  useMaterialAttachments,
  useUploadMaterialAttachment,
  useDeleteMaterialAttachment,
} from "@/features/procurement/api/useMaterialAttachments";
import type { ApprovalChainBundle } from "@/features/procurement/api/useApprovalChains";
import type { Department, DepartmentMember, MaterialRequest } from "@/types/domain";
import type { MiniProfile } from "@/features/company/api/useProfilesByIds";
import type { CompanyMember } from "@/features/company/api/useCompanyMembers";
import { fmtMoney } from "@/utils/money";
import { fmt } from "@/utils/dates";
import { getErrorMessage } from "@/utils/errors";

function numOrNull(v: string): number | null {
  const n = Number(v);
  return v.trim() === "" || Number.isNaN(n) ? null : n;
}

function AttachmentsList({
  attachments,
  canDelete,
  onDelete,
}: {
  attachments: { id: string; fileUrl: string; fileName: string }[];
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  if (attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map((a) => (
        <div key={a.id} className="inline-flex items-center gap-1.5 text-xs bg-bg rounded-lg px-2 py-1">
          <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
            <Paperclip size={11} /> {a.fileName}
          </a>
          {canDelete && <IconButton icon={Trash2} label="حذف المرفق" tone="critical" onClick={() => onDelete(a.id)} />}
        </div>
      ))}
    </div>
  );
}

export function SourcingSection({
  request,
  chainBundle,
  currentUserId,
  isOrgManager,
  departments,
  members,
  companyMembers,
  profilesById,
}: {
  request: MaterialRequest;
  chainBundle: ApprovalChainBundle | null;
  currentUserId: string;
  isOrgManager: boolean;
  departments: Department[];
  members: DepartmentMember[];
  companyMembers: CompanyMember[];
  profilesById: Map<string, MiniProfile>;
}) {
  const canEdit = request.status === "draft" || request.status === "sample_rejected";

  const saveSourcingDetails = useSaveSourcingDetails();
  const submitSourcing = useSubmitMaterialSourcing(request.projectId);
  const optionsQuery = useMaterialOptions(request.id);
  const addOption = useAddMaterialOption(request.id);
  const deleteOption = useDeleteMaterialOption(request.id);
  const attachmentsQuery = useMaterialAttachments(request.id);
  const uploadAttachment = useUploadMaterialAttachment(request.id);
  const deleteAttachment = useDeleteMaterialAttachment(request.id);

  const options = optionsQuery.data ?? [];
  const attachments = attachmentsQuery.data ?? [];
  const requestAttachments = attachments.filter((a) => a.optionId === null);

  const [itemName, setItemName] = useState(request.itemName);
  const [description, setDescription] = useState(request.description ?? "");
  const [quantity, setQuantity] = useState(request.quantity?.toString() ?? "");
  const [targetUnitPrice, setTargetUnitPrice] = useState(request.targetUnitPrice?.toString() ?? "");
  const [neededBy, setNeededBy] = useState(request.neededBy ?? "");
  const [editError, setEditError] = useState("");

  const [submitNote, setSubmitNote] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [newOptionDesc, setNewOptionDesc] = useState("");
  const [newOptionPrice, setNewOptionPrice] = useState("");
  const [newOptionFiles, setNewOptionFiles] = useState<FileList | null>(null);
  const [optionError, setOptionError] = useState("");

  const saveEdit = async () => {
    if (!itemName.trim()) return;
    setEditError("");
    try {
      await saveSourcingDetails.mutateAsync({
        requestId: request.id,
        projectId: request.projectId,
        itemName: itemName.trim(),
        description: description.trim() || null,
        quantity: numOrNull(quantity),
        targetUnitPrice: numOrNull(targetUnitPrice),
        neededBy: neededBy || null,
      });
    } catch (err) {
      setEditError(getErrorMessage(err, "تعذّر حفظ البيانات، حاول مجدداً"));
    }
  };

  const handleUploadRequestFile = async (file: File) => {
    await uploadAttachment.mutateAsync({ file, optionId: null });
  };

  const handleSubmit = async () => {
    setSubmitError("");
    try {
      await submitSourcing.mutateAsync({ requestId: request.id, note: submitNote.trim() || null });
      setSubmitNote("");
    } catch (err) {
      setSubmitError(getErrorMessage(err, "تعذّر إرسال الطلب لقسم المشتريات، حاول مجدداً"));
    }
  };

  const handleAddOption = async () => {
    if (!newOptionDesc.trim()) return;
    setOptionError("");
    try {
      const optionId = await addOption.mutateAsync({ description: newOptionDesc.trim(), price: numOrNull(newOptionPrice) });
      if (newOptionFiles) {
        for (const file of Array.from(newOptionFiles)) {
          await uploadAttachment.mutateAsync({ file, optionId });
        }
      }
      setNewOptionDesc("");
      setNewOptionPrice("");
      setNewOptionFiles(null);
    } catch (err) {
      setOptionError(getErrorMessage(err, "تعذّر إضافة العرض، حاول مجدداً"));
    }
  };

  const procurementStep = chainBundle?.steps.find((s) => s.stepOrder === 1) ?? null;
  const canManageOptions =
    !!procurementStep && procurementStep.status === "pending" && (procurementStep.assignedUserId === currentUserId || isOrgManager);

  return (
    <div>
      <h2 className="text-sm font-bold text-ink mb-3">المرحلة 1 — طلب مادة من المشتريات</h2>

      {canEdit ? (
        <div className="mb-4">
          <div className="mb-3">
            <FieldLabel>اسم المادة/المنتج</FieldLabel>
            <TextInput value={itemName} onChange={(e) => setItemName(e.target.value)} />
          </div>
          <div className="mb-3">
            <FieldLabel>وصف/مواصفات المطلوب</FieldLabel>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border resize-y"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <FieldLabel>الكمية الكلية المطلوبة</FieldLabel>
              <TextInput type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div>
              <FieldLabel>سعر الوحدة المستهدف (اختياري)</FieldLabel>
              <TextInput type="number" value={targetUnitPrice} onChange={(e) => setTargetUnitPrice(e.target.value)} />
            </div>
            <div>
              <FieldLabel>موعد الحاجة لاستلام العروض</FieldLabel>
              <TextInput type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
            </div>
          </div>
          <ErrorText>{editError}</ErrorText>
          <SecondaryButton onClick={saveEdit} disabled={saveSourcingDetails.isPending || !itemName.trim()} className="text-xs px-3 py-1.5">
            {saveSourcingDetails.isPending ? "جارٍ الحفظ..." : "حفظ"}
          </SecondaryButton>
        </div>
      ) : (
        <>
          {request.description && <p className="text-sm text-ink-soft whitespace-pre-wrap mb-3">{request.description}</p>}
          {(request.quantity != null || request.targetUnitPrice != null || request.neededBy) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              <StatCard label="الكمية المطلوبة" value={request.quantity ?? "—"} />
              <StatCard label="سعر الوحدة المستهدف" value={request.targetUnitPrice ? fmtMoney(request.targetUnitPrice) : "—"} />
              <StatCard label="موعد الحاجة للعروض" value={request.neededBy ? fmt(request.neededBy) : "—"} />
            </div>
          )}
        </>
      )}

      <div className="mb-4">
        <FieldLabel>مرفقات الطلب (صور/ملفات توضّح المطلوب)</FieldLabel>
        <AttachmentsList attachments={requestAttachments} canDelete={canEdit} onDelete={(id) => deleteAttachment.mutate(id)} />
        {canEdit && (
          <label className="mt-2 flex items-center gap-2 border border-dashed border-line rounded-lg px-3 py-2 cursor-pointer text-xs text-ink-soft hover:bg-bg w-fit">
            <Upload size={13} /> إرفاق صورة/ملف
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadRequestFile(file);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      {canEdit && (
        <div className="mb-4">
          <FieldLabel>ملاحظة لقسم المشتريات (اختياري)</FieldLabel>
          <TextInput value={submitNote} onChange={(e) => setSubmitNote(e.target.value)} placeholder="سياق إضافي" />
          <ErrorText>{submitError}</ErrorText>
          <PrimaryButton onClick={handleSubmit} disabled={submitSourcing.isPending || !itemName.trim()} className="w-auto px-4 py-2 text-xs mt-2">
            {submitSourcing.isPending ? "جارٍ الإرسال..." : "إرسال لقسم المشتريات"}
          </PrimaryButton>
        </div>
      )}

      {chainBundle && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-ink-soft mb-2">مسار الاعتماد</h3>
          <ApprovalStepsList
            steps={chainBundle.steps}
            chainType={chainBundle.chain.chainType}
            requestId={request.id}
            projectId={request.projectId}
            currentUserId={currentUserId}
            departments={departments}
            members={members}
            companyMembers={companyMembers}
            profilesById={profilesById}
            isOrgManager={isOrgManager}
          />
        </div>
      )}

      {(options.length > 0 || canManageOptions) && (
        <div>
          <h3 className="text-xs font-bold text-ink-soft mb-2">العروض/البدائل المرفقة من المشتريات</h3>
          {options.length === 0 ? (
            <p className="text-xs text-ink-soft mb-2">لا توجد عروض مرفقة بعد</p>
          ) : (
            <div className="flex flex-col gap-2 mb-3">
              {options.map((o) => (
                <div key={o.id} className="bg-bg rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-ink">{o.description}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-ink font-mono">{o.price ? fmtMoney(o.price) : "—"}</span>
                      {canManageOptions && (
                        <IconButton icon={Trash2} label="حذف العرض" tone="critical" onClick={() => deleteOption.mutate(o.id)} />
                      )}
                    </div>
                  </div>
                  <AttachmentsList
                    attachments={attachments.filter((a) => a.optionId === o.id)}
                    canDelete={canManageOptions}
                    onDelete={(id) => deleteAttachment.mutate(id)}
                  />
                </div>
              ))}
            </div>
          )}

          {canManageOptions && (
            <div className="border-t border-line/60 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                <TextInput
                  placeholder="وصف العرض/البديل"
                  value={newOptionDesc}
                  onChange={(e) => setNewOptionDesc(e.target.value)}
                  className="sm:col-span-2"
                />
                <TextInput placeholder="السعر" type="number" value={newOptionPrice} onChange={(e) => setNewOptionPrice(e.target.value)} />
              </div>
              <input type="file" multiple onChange={(e) => setNewOptionFiles(e.target.files)} className="text-xs mb-2" />
              <ErrorText>{optionError}</ErrorText>
              <SecondaryButton onClick={handleAddOption} disabled={!newOptionDesc.trim() || addOption.isPending} className="text-xs px-3 py-1.5">
                {addOption.isPending ? "جارٍ الإضافة..." : "إضافة عرض"}
              </SecondaryButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
