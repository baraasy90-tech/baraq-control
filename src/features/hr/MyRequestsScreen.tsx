import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Card, StatCard, SecondaryButton, PrimaryButton, IconButton, FieldLabel, TextInput, ErrorText, Modal } from "@/components/ui";
import { useCompany } from "@/features/company/useCompany";
import { useDepartments } from "@/features/company/api/useDepartments";
import { useDepartmentMembers } from "@/features/company/api/useDepartmentMembers";
import { useProfilesByIds } from "@/features/company/api/useProfilesByIds";
import { useMyHrRequests, useCompanyHrRequests, useCreateHrRequest, useReviewHrRequest } from "@/features/hr/api/useHrRequests";
import { fmt } from "@/utils/dates";
import type { HrRequestType } from "@/types/domain";

const TYPE_LABEL: Record<HrRequestType, string> = { leave: "إجازة", contract_renewal: "تجديد عقد", other: "أمر آخر" };
const STATUS_LABEL: Record<string, string> = { pending: "قيد المراجعة", approved: "معتمد", rejected: "مرفوض" };
const STATUS_TONE: Record<string, string> = {
  pending: "text-warn bg-warn-bg",
  approved: "text-accent bg-accent-bg",
  rejected: "text-critical bg-critical-bg",
};

export function MyRequestsScreen() {
  const navigate = useNavigate();
  const { company, profile } = useCompany();

  const departmentsQuery = useDepartments(company.id);
  const departments = departmentsQuery.data ?? [];
  const membersQuery = useDepartmentMembers(departments.map((d) => d.id));
  const members = membersQuery.data ?? [];
  const isOwner = company.createdBy === profile.id;
  const isExecutive = members.some(
    (m) => m.userId === profile.id && departments.find((d) => d.id === m.departmentId)?.type === "executive"
  );
  const isHrDeptHead = members.some(
    (m) => m.userId === profile.id && m.role === "head" && departments.find((d) => d.id === m.departmentId)?.type === "hr"
  );
  const canHrApprove = isOwner || isExecutive || isHrDeptHead;

  const myRequestsQuery = useMyHrRequests(profile.id);
  const companyRequestsQuery = useCompanyHrRequests(canHrApprove ? company.id : undefined);
  const createRequest = useCreateHrRequest();
  const reviewRequest = useReviewHrRequest();

  const inboxUserIds = (companyRequestsQuery.data ?? []).map((r) => r.userId);
  const inboxProfilesQuery = useProfilesByIds(inboxUserIds);
  const inboxProfiles = inboxProfilesQuery.data ?? new Map();

  const [creating, setCreating] = useState(false);
  const [type, setType] = useState<HrRequestType>("leave");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const openCreate = () => {
    setType("leave");
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setError("");
    setCreating(true);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setError("");
    try {
      await createRequest.mutateAsync({
        companyId: company.id,
        userId: profile.id,
        type,
        title: title.trim(),
        description: description.trim() || null,
        startDate: type === "leave" ? startDate || null : null,
        endDate: type === "leave" ? endDate || null : null,
      });
      setCreating(false);
    } catch {
      setError("تعذّر تقديم الطلب، حاول مجدداً");
    }
  };

  const handleReview = async (requestId: string, approve: boolean) => {
    await reviewRequest.mutateAsync({ requestId, approve, note: reviewNote.trim() || null });
    setReviewingId(null);
    setReviewNote("");
  };

  const myRequests = myRequestsQuery.data ?? [];
  const companyRequests = companyRequestsQuery.data ?? [];
  const pendingInbox = companyRequests.filter((r) => r.status === "pending");

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-ink">طلباتي</h1>
        <SecondaryButton onClick={() => navigate("/")} className="text-sm">
          رجوع
        </SecondaryButton>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-ink">طلبات الموارد البشرية الخاصة بي</h2>
        <IconButton icon={Plus} label="طلب جديد" onClick={openCreate} />
      </div>

      {myRequests.length === 0 ? (
        <div className="bg-panel border border-dashed border-line rounded-xl p-8 text-center text-sm text-ink-soft mb-8">
          لا توجد طلبات بعد — اضغط "+" لتقديم إجازة أو تجديد عقد أو أي طلب آخر
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-8">
          {myRequests.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-ink-soft bg-bg rounded-full px-1.5 py-0.5">{TYPE_LABEL[r.type]}</span>
                    <span className="text-sm font-bold text-ink truncate">{r.title}</span>
                    <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${STATUS_TONE[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  {r.startDate && (
                    <div className="text-xs text-ink-soft mt-1">
                      {fmt(r.startDate)} {r.endDate ? `→ ${fmt(r.endDate)}` : ""}
                    </div>
                  )}
                  {r.description && <div className="text-xs text-ink-soft mt-1">{r.description}</div>}
                  {r.status !== "pending" && r.reviewNote && (
                    <div className="text-xs text-ink-soft mt-1">ملاحظة المراجعة: {r.reviewNote}</div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {canHrApprove && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-ink">صندوق طلبات الموظفين</h2>
            <StatCard label="معلّقة" value={pendingInbox.length} tone={pendingInbox.length > 0 ? "warn" : undefined} />
          </div>

          {pendingInbox.length === 0 ? (
            <div className="bg-panel border border-dashed border-line rounded-xl p-8 text-center text-sm text-ink-soft">
              لا توجد طلبات معلّقة حالياً
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {pendingInbox.map((r) => (
                <Card key={r.id}>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] text-ink-soft bg-bg rounded-full px-1.5 py-0.5">{TYPE_LABEL[r.type]}</span>
                    <span className="text-sm font-bold text-ink">{inboxProfiles.get(r.userId)?.fullName ?? "—"}</span>
                    <span className="text-xs text-ink-soft">— {r.title}</span>
                  </div>
                  {r.startDate && (
                    <div className="text-xs text-ink-soft mb-1">
                      {fmt(r.startDate)} {r.endDate ? `→ ${fmt(r.endDate)}` : ""}
                    </div>
                  )}
                  {r.description && <div className="text-xs text-ink-soft mb-2">{r.description}</div>}

                  {reviewingId === r.id ? (
                    <>
                      <TextInput
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="ملاحظة الاعتماد/الرفض (اختياري)"
                      />
                      <div className="flex gap-2 mt-2">
                        <PrimaryButton onClick={() => handleReview(r.id, true)} className="w-auto px-4 py-1.5 text-xs">
                          اعتماد
                        </PrimaryButton>
                        <SecondaryButton onClick={() => handleReview(r.id, false)} className="text-xs px-3 py-1.5">
                          رفض
                        </SecondaryButton>
                      </div>
                    </>
                  ) : (
                    <SecondaryButton onClick={() => setReviewingId(r.id)} className="text-xs px-3 py-1.5">
                      مراجعة
                    </SecondaryButton>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {creating && (
        <Modal title="طلب جديد" onClose={() => setCreating(false)}>
          <FieldLabel>نوع الطلب</FieldLabel>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as HrRequestType)}
            className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink"
          >
            {Object.entries(TYPE_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <div className="mb-3" />
          <FieldLabel>العنوان</FieldLabel>
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <div className="mb-3" />
          {type === "leave" && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <FieldLabel>من تاريخ</FieldLabel>
                  <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <FieldLabel>إلى تاريخ</FieldLabel>
                  <TextInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            </>
          )}
          <FieldLabel>تفاصيل إضافية (اختياري)</FieldLabel>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border resize-y"
          />
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2 mt-4">
            <PrimaryButton onClick={handleCreate} disabled={!title.trim() || createRequest.isPending} className="flex-1">
              {createRequest.isPending ? "جارٍ التقديم..." : "تقديم الطلب"}
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
