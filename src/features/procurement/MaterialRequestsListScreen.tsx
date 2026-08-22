import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Package, Plus } from "lucide-react";
import { Card, SecondaryButton, PrimaryButton, FieldLabel, TextInput, ErrorText, Modal } from "@/components/ui";
import { useMaterialRequests } from "@/features/procurement/api/useMaterialRequests";
import { useCreateMaterialRequest } from "@/features/procurement/api/useSaveMaterialRequest";
import { fmtMoney } from "@/utils/money";
import { fmt } from "@/utils/dates";
import { MATERIAL_STATUS_LABEL, MATERIAL_STATUS_TONE } from "@/features/procurement/statusLabels";

export function MaterialRequestsListScreen() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const requestsQuery = useMaterialRequests(projectId);
  const createRequest = useCreateMaterialRequest();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  const requests = requestsQuery.data ?? [];

  const handleCreate = async () => {
    if (!newName.trim() || !projectId) return;
    setError("");
    try {
      const result = await createRequest.mutateAsync({ projectId, itemName: newName.trim(), description: null });
      setCreating(false);
      setNewName("");
      navigate(`/projects/${projectId}/materials/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر إنشاء الطلب، حاول مجدداً");
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-ink">اعتماد المواد والمشتريات</h1>
        <SecondaryButton onClick={() => navigate(`/projects/${projectId}`)} className="text-sm">
          رجوع للمشروع
        </SecondaryButton>
      </div>

      {requestsQuery.isLoading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}

      {!requestsQuery.isLoading && requests.length === 0 ? (
        <div className="bg-panel border border-dashed border-line rounded-xl p-10 text-center text-sm text-ink-soft mb-4">
          لا توجد طلبات مواد مسجّلة بعد لهذا المشروع
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {requests.map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer hover:border-primary/40"
              onClick={() => navigate(`/projects/${projectId}/materials/${r.id}`)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2">
                  <Package size={18} className="text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-ink truncate">{r.itemName}</div>
                    <div className="text-xs text-ink-soft">{fmt(r.createdAt)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${MATERIAL_STATUS_TONE[r.status]}`}>
                    {MATERIAL_STATUS_LABEL[r.status]}
                  </span>
                  <span className="text-sm font-bold text-ink font-mono">{r.quotePrice ? fmtMoney(r.quotePrice) : "—"}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SecondaryButton onClick={() => setCreating(true)} className="w-auto px-4 inline-flex items-center gap-1.5">
        <Plus size={15} strokeWidth={2.5} /> طلب مادة جديد
      </SecondaryButton>

      {creating && (
        <Modal title="طلب مادة/عينة جديد" onClose={() => setCreating(false)}>
          <FieldLabel>اسم المادة/المنتج</FieldLabel>
          <TextInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="مثال: بلاط أرضيات، دهانات" autoFocus />
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2 mt-4">
            <PrimaryButton onClick={handleCreate} disabled={!newName.trim() || createRequest.isPending} className="flex-1">
              {createRequest.isPending ? "جارٍ الإنشاء..." : "إنشاء ومتابعة"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setCreating(false)} className="flex-1">
              إلغاء
            </SecondaryButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
