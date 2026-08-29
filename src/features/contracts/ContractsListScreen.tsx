import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FileText, Paperclip, Plus, Trash2 } from "lucide-react";
import { Card, SecondaryButton, PrimaryButton, IconButton, FieldLabel, TextInput, ErrorText, Modal } from "@/components/ui";
import { useContracts } from "@/features/contracts/api/useContract";
import { useSaveContract } from "@/features/contracts/api/useSaveContract";
import { useDeleteContract } from "@/features/contracts/api/useDeleteContract";
import { useActivities } from "@/features/schedule/api/useActivities";
import { getPlannedAmount } from "@/features/budget/lib/budget";
import { BudgetVarianceBanner } from "@/features/budget/BudgetVarianceBanner";
import { fmtMoney } from "@/utils/money";
import { fmt } from "@/utils/dates";
import { STATUS_LABEL, STATUS_TONE } from "@/features/contracts/statusLabels";
import { useCompany } from "@/features/company/useCompany";
import { getErrorMessage } from "@/utils/errors";
import type { Contract } from "@/types/domain";

export function ContractsListScreen() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { company } = useCompany();
  const contractsQuery = useContracts(projectId);
  const activitiesQuery = useActivities(projectId);
  const saveContract = useSaveContract();
  const deleteContract = useDeleteContract(projectId);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Contract | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const contracts = contractsQuery.data ?? [];
  // فقط العقود المعتمدة تُحسب ضمن قيمة العقود الرسمية — المسودات وما بانتظار الاعتماد
  // ليست ملزمة بعد.
  const totalContractValue = contracts.filter((c) => c.status === "approved").reduce((sum, c) => sum + (c.totalValue ?? 0), 0);
  const trackedBudget = (activitiesQuery.data ?? []).reduce((sum, a) => sum + getPlannedAmount(a), 0);

  const handleCreate = async () => {
    if (!newName.trim() || !projectId) return;
    setError("");
    try {
      const result = await saveContract.mutateAsync({
        projectId,
        name: newName.trim(),
        startDate: null,
        durationDays: null,
        totalValue: null,
        paymentTerms: null,
        hasAdvancePayment: false,
        advancePaymentPercentage: null,
        advancePaymentGuaranteeNote: null,
        advanceDeductionPercentage: 10,
        retentionPercentage: null,
        retentionReleased: false,
        retentionReleaseNote: null,
        vatInclusive: false,
        vatRate: company.vatRate,
      });
      setCreating(false);
      setNewName("");
      navigate(`/projects/${projectId}/contract/${result.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "تعذّر إنشاء العقد، حاول مجدداً"));
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-ink">العقود</h1>
        <SecondaryButton onClick={() => navigate(`/projects/${projectId}`)} className="text-sm">
          رجوع للمشروع
        </SecondaryButton>
      </div>

      {contracts.length > 0 && (
        <BudgetVarianceBanner projectId={projectId!} contractValue={totalContractValue} trackedBudget={trackedBudget} />
      )}

      {contractsQuery.isLoading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}

      {!contractsQuery.isLoading && contracts.length === 0 ? (
        <div className="bg-panel border border-dashed border-line rounded-xl p-10 text-center text-sm text-ink-soft mb-4">
          لا توجد عقود مسجّلة بعد لهذا المشروع
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {contracts.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:border-primary/40"
              onClick={() => navigate(`/projects/${projectId}/contract/${c.id}`)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2">
                  <FileText size={18} className="text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-ink truncate flex items-center gap-1.5">
                      {c.name}
                      {c.pdfUrl && (
                        <span title="يحتوي نسخة PDF مؤرشفة" className="shrink-0 inline-flex">
                          <Paperclip size={13} className="text-ink-soft" />
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-ink-soft">
                      {c.startDate ? fmt(c.startDate) : "بدون تاريخ بدء"} · {c.durationDays ? `${c.durationDays} يوم` : "بدون مدة"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${STATUS_TONE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                  <span className="text-sm font-bold text-ink font-mono">{c.totalValue ? fmtMoney(c.totalValue) : "—"}</span>
                  {(c.status === "draft" || c.status === "rejected") && (
                    <IconButton
                      icon={Trash2}
                      label="حذف العقد"
                      tone="critical"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteError("");
                        setConfirmDelete(c);
                      }}
                    />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SecondaryButton onClick={() => setCreating(true)} className="w-auto px-4 inline-flex items-center gap-1.5">
        <Plus size={15} strokeWidth={2.5} /> إضافة عقد
      </SecondaryButton>

      {creating && (
        <Modal title="عقد جديد" onClose={() => setCreating(false)}>
          <FieldLabel>اسم العقد</FieldLabel>
          <TextInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="مثال: عقد العظم، عقد التشطيبات" autoFocus />
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2 mt-4">
            <PrimaryButton onClick={handleCreate} disabled={!newName.trim() || saveContract.isPending} className="flex-1">
              {saveContract.isPending ? "جارٍ الإنشاء..." : "إنشاء ومتابعة"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setCreating(false)} className="flex-1">
              إلغاء
            </SecondaryButton>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="تأكيد حذف العقد" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-ink-soft mb-5">
            هل أنت متأكد من حذف عقد "{confirmDelete.name}" نهائياً؟ سيُحذف معه كل بنوده ودفعاته واستقطاعاته بشكل لا رجعة فيه.
          </p>
          <ErrorText>{deleteError}</ErrorText>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setConfirmDelete(null)} className="flex-1">
              إلغاء
            </SecondaryButton>
            <button
              onClick={async () => {
                try {
                  await deleteContract.mutateAsync(confirmDelete.id);
                  setConfirmDelete(null);
                } catch (err) {
                  setDeleteError(getErrorMessage(err, "تعذّر حذف العقد، حاول مجدداً"));
                }
              }}
              disabled={deleteContract.isPending}
              className="flex-1 py-2.5 rounded-lg bg-critical text-white border-none font-bold text-sm cursor-pointer disabled:opacity-50"
            >
              {deleteContract.isPending ? "جارٍ الحذف..." : "حذف نهائياً"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
