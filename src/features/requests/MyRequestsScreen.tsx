import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Paperclip } from "lucide-react";
import { Card, StatCard, SecondaryButton, PrimaryButton, IconButton, FieldLabel, TextInput, ErrorText, Modal } from "@/components/ui";
import { useCompany } from "@/features/company/useCompany";
import { useAuth } from "@/features/auth/AuthContext";
import { useDepartments } from "@/features/company/api/useDepartments";
import { useDepartmentMembers } from "@/features/company/api/useDepartmentMembers";
import { useProfilesByIds } from "@/features/company/api/useProfilesByIds";
import {
  useMyInternalRequests,
  useCompanyInternalRequests,
  useCreateInternalRequest,
  useReviewInternalRequest,
} from "@/features/requests/api/useInternalRequests";
import { DEPARTMENT_TYPE_LABEL } from "@/features/company/departmentTypeLabels";
import { uploadFile, uniqueFileName } from "@/lib/supabase/storage";
import { fmt } from "@/utils/dates";
import type { InternalRequestType } from "@/types/domain";

const TYPE_LABEL: Record<InternalRequestType, string> = { leave: "إجازة", contract_renewal: "تجديد عقد", other: "أمر آخر" };
const STATUS_LABEL: Record<string, string> = { pending: "قيد المراجعة", approved: "معتمد", rejected: "مرفوض" };
const STATUS_TONE: Record<string, string> = {
  pending: "text-warn bg-warn-bg",
  approved: "text-accent bg-accent-bg",
  rejected: "text-critical bg-critical-bg",
};

export function MyRequestsScreen() {
  const navigate = useNavigate();
  const { company, profile } = useCompany();
  const { user } = useAuth();

  const departmentsQuery = useDepartments(company.id);
  const departments = departmentsQuery.data ?? [];
  const membersQuery = useDepartmentMembers(departments.map((d) => d.id));
  const members = membersQuery.data ?? [];

  const myRequestsQuery = useMyInternalRequests(profile.id);
  const companyRequestsQuery = useCompanyInternalRequests(company.id);
  const createRequest = useCreateInternalRequest();
  const reviewRequest = useReviewInternalRequest();

  const myRequests = myRequestsQuery.data ?? [];
  const inboxRequests = (companyRequestsQuery.data ?? []).filter((r) => r.userId !== profile.id);

  const inboxUserIds = inboxRequests.map((r) => r.userId);
  const inboxProfilesQuery = useProfilesByIds(inboxUserIds);
  const inboxProfiles = inboxProfilesQuery.data ?? new Map();

  const [creating, setCreating] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [type, setType] = useState<InternalRequestType>("other");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const selectedDept = departments.find((d) => d.id === departmentId);
  const departmentMembers = members.filter((m) => m.departmentId === departmentId);

  const openCreate = () => {
    setDepartmentId("");
    setTargetUserId("");
    setType("other");
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setFile(null);
    setError("");
    setCreating(true);
  };

  const handleCreate = async () => {
    if (!title.trim() || !departmentId || !user) return;
    setError("");
    try {
      let attachmentUrl: string | null = null;
      if (file) {
        setUploading(true);
        attachmentUrl = await uploadFile("documents", `${user.id}/${uniqueFileName(file.name)}`, file);
      }
      await createRequest.mutateAsync({
        companyId: company.id,
        userId: profile.id,
        departmentId,
        targetUserId: targetUserId || null,
        type: selectedDept?.type === "hr" ? type : null,
        title: title.trim(),
        description: description.trim() || null,
        startDate: selectedDept?.type === "hr" && type === "leave" ? startDate || null : null,
        endDate: selectedDept?.type === "hr" && type === "leave" ? endDate || null : null,
        attachmentUrl,
      });
      setCreating(false);
    } catch {
      setError("تعذّر تقديم الطلب، حاول مجدداً");
    } finally {
      setUploading(false);
    }
  };

  const handleReview = async (requestId: string, approve: boolean) => {
    await reviewRequest.mutateAsync({ requestId, approve, note: reviewNote.trim() || null });
    setReviewingId(null);
    setReviewNote("");
  };

  const pendingInbox = inboxRequests.filter((r) => r.status === "pending");

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-ink">طلباتي</h1>
        <SecondaryButton onClick={() => navigate("/")} className="text-sm">
          رجوع
        </SecondaryButton>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-ink">طلباتي المُرسَلة</h2>
        <IconButton icon={Plus} label="طلب جديد" onClick={openCreate} />
      </div>

      {myRequests.length === 0 ? (
        <div className="bg-panel border border-dashed border-line rounded-xl p-8 text-center text-sm text-ink-soft mb-8">
          لا توجد طلبات بعد — اضغط "+" لإرسال طلب لأي قسم (موارد بشرية، مالية، مشتريات، الإدارة العليا...)
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-8">
          {myRequests.map((r) => {
            const dept = departments.find((d) => d.id === r.departmentId);
            const target = r.targetUserId ? inboxProfiles.get(r.targetUserId) : undefined;
            return (
              <Card key={r.id}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.type && <span className="text-[10px] text-ink-soft bg-bg rounded-full px-1.5 py-0.5">{TYPE_LABEL[r.type]}</span>}
                      <span className="text-sm font-bold text-ink truncate">{r.title}</span>
                      <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${STATUS_TONE[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                    <div className="text-xs text-ink-soft mt-1">
                      إلى: {dept ? DEPARTMENT_TYPE_LABEL[dept.type] + ` (${dept.name})` : "—"}
                      {target ? ` — ${target.fullName}` : ""}
                    </div>
                    {r.startDate && (
                      <div className="text-xs text-ink-soft mt-1">
                        {fmt(r.startDate)} {r.endDate ? `→ ${fmt(r.endDate)}` : ""}
                      </div>
                    )}
                    {r.description && <div className="text-xs text-ink-soft mt-1">{r.description}</div>}
                    {r.attachmentUrl && (
                      <a href={r.attachmentUrl} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 mt-1">
                        <Paperclip size={11} /> عرض المرفق
                      </a>
                    )}
                    {r.status !== "pending" && r.reviewNote && (
                      <div className="text-xs text-ink-soft mt-1">ملاحظة الرد: {r.reviewNote}</div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-bold text-ink">طلبات موجَّهة إليّ</h2>
        <StatCard label="معلّقة" value={pendingInbox.length} tone={pendingInbox.length > 0 ? "warn" : undefined} />
      </div>

      {pendingInbox.length === 0 ? (
        <div className="bg-panel border border-dashed border-line rounded-xl p-8 text-center text-sm text-ink-soft">
          لا توجد طلبات معلّقة موجَّهة إليك حالياً
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {pendingInbox.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {r.type && <span className="text-[10px] text-ink-soft bg-bg rounded-full px-1.5 py-0.5">{TYPE_LABEL[r.type]}</span>}
                <span className="text-sm font-bold text-ink">{inboxProfiles.get(r.userId)?.fullName ?? "—"}</span>
                <span className="text-xs text-ink-soft">— {r.title}</span>
              </div>
              {r.startDate && (
                <div className="text-xs text-ink-soft mb-1">
                  {fmt(r.startDate)} {r.endDate ? `→ ${fmt(r.endDate)}` : ""}
                </div>
              )}
              {r.description && <div className="text-xs text-ink-soft mb-2">{r.description}</div>}
              {r.attachmentUrl && (
                <a href={r.attachmentUrl} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 mb-2">
                  <Paperclip size={11} /> عرض المرفق
                </a>
              )}

              {reviewingId === r.id ? (
                <>
                  <TextInput
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="ملاحظة الرد/الاعتماد (اختياري)"
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
                  الرد
                </SecondaryButton>
              )}
            </Card>
          ))}
        </div>
      )}

      {creating && (
        <Modal title="طلب جديد" onClose={() => setCreating(false)}>
          <FieldLabel>القسم المطلوب</FieldLabel>
          <select
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setTargetUserId("");
            }}
            className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink"
          >
            <option value="">اختر القسم...</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {DEPARTMENT_TYPE_LABEL[d.type]} ({d.name})
              </option>
            ))}
          </select>
          <div className="mb-3" />

          <FieldLabel>الشخص المطلوب (اختياري)</FieldLabel>
          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            disabled={!departmentId}
            className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink disabled:opacity-50"
          >
            <option value="">أي مسؤول بالقسم (بدون تحديد)</option>
            {departmentMembers.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.fullName}
              </option>
            ))}
          </select>
          <div className="mb-3" />

          {selectedDept?.type === "hr" && (
            <>
              <FieldLabel>نوع الطلب</FieldLabel>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as InternalRequestType)}
                className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink"
              >
                {Object.entries(TYPE_LABEL).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              {type === "leave" && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <FieldLabel>من تاريخ</FieldLabel>
                    <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>إلى تاريخ</FieldLabel>
                    <TextInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="mb-3" />
            </>
          )}

          <FieldLabel>العنوان</FieldLabel>
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="mb-3" />

          <FieldLabel>تفاصيل إضافية (اختياري)</FieldLabel>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border resize-y"
          />
          <div className="mb-3" />

          <FieldLabel>مرفق (اختياري)</FieldLabel>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />

          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2 mt-4">
            <PrimaryButton
              onClick={handleCreate}
              disabled={!title.trim() || !departmentId || createRequest.isPending || uploading}
              className="flex-1"
            >
              {createRequest.isPending || uploading ? "جارٍ التقديم..." : "تقديم الطلب"}
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
