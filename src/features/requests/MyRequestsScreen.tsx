import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Card, StatCard, SecondaryButton, PrimaryButton, IconButton, FieldLabel, TextInput, ErrorText, Modal } from "@/components/ui";
import { useCompany } from "@/features/company/useCompany";
import { useDepartments } from "@/features/company/api/useDepartments";
import { useDepartmentMembers } from "@/features/company/api/useDepartmentMembers";
import { useProfilesByIds } from "@/features/company/api/useProfilesByIds";
import { useMyInternalRequests, useCompanyInternalRequests, useCreateInternalRequest } from "@/features/requests/api/useInternalRequests";
import { useApprovalChainTemplates, useCreateApprovalChainTemplate } from "@/features/requests/api/useApprovalChainTemplates";
import { ChainBuilder } from "@/features/requests/ChainBuilder";
import { ChainStepsSection } from "@/features/requests/ChainStepsSection";
import { RequestAttachmentsSection } from "@/features/requests/RequestAttachmentsSection";
import { RecordAuditTimeline } from "@/features/company/RecordAuditTimeline";
import { fmt } from "@/utils/dates";
import type { ApprovalChainStepInput, ApprovalChainType, InternalRequestType } from "@/types/domain";

const TYPE_LABEL: Record<InternalRequestType, string> = {
  inquiry: "استفسار",
  objection: "اعتراض",
  complaint: "شكوى",
  approval: "اعتماد",
  other: "عام",
  leave: "إجازة",
  contract_renewal: "تجديد عقد",
};
const STATUS_LABEL: Record<string, string> = { pending: "قيد الاعتماد", approved: "معتمد", rejected: "مرفوض" };
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
  const isExecutive = members.some((m) => m.userId === profile.id && departments.find((d) => d.id === m.departmentId)?.type === "executive");
  const isOrgManager = isOwner || isExecutive;

  const myRequestsQuery = useMyInternalRequests(profile.id);
  const companyRequestsQuery = useCompanyInternalRequests(company.id);
  const createRequest = useCreateInternalRequest();

  const templatesQuery = useApprovalChainTemplates(company.id);
  const templates = templatesQuery.data ?? [];
  const createTemplate = useCreateApprovalChainTemplate(company.id);

  const myRequests = myRequestsQuery.data ?? [];
  const inboxRequests = (companyRequestsQuery.data ?? []).filter((r) => r.userId !== profile.id);

  const inboxUserIds = inboxRequests.map((r) => r.userId);
  const inboxProfilesQuery = useProfilesByIds(inboxUserIds);
  const inboxProfiles = inboxProfilesQuery.data ?? new Map();
  const allProfilesQuery = useProfilesByIds(members.map((m) => m.userId));
  const profilesById = allProfilesQuery.data ?? new Map();

  const [creating, setCreating] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [chainType, setChainType] = useState<ApprovalChainType>("linear");
  const [steps, setSteps] = useState<ApprovalChainStepInput[]>([{ departmentId: null, userId: null }]);
  const [type, setType] = useState<InternalRequestType>("other");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const openCreate = () => {
    setTemplateId("");
    setChainType("linear");
    setSteps([{ departmentId: null, userId: null }]);
    setType("other");
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setNote("");
    setSaveAsTemplate(false);
    setTemplateName("");
    setError("");
    setCreating(true);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    const incompleteIndex = templateId ? -1 : steps.findIndex((s) => !s.departmentId && !s.userId);
    if (incompleteIndex !== -1) {
      setError(`لازم تحديد قسم أو شخص لخطوة الاعتماد رقم ${incompleteIndex + 1} — أو احذفها إن لم تكن مطلوبة`);
      return;
    }
    if (saveAsTemplate && !templateId && !templateName.trim()) {
      setError("لازم اسم للقالب لو تبي تحفظه");
      return;
    }
    setError("");
    try {
      await createRequest.mutateAsync({
        type: type === "other" ? null : type,
        title: title.trim(),
        description: description.trim() || null,
        startDate: type === "leave" ? startDate || null : null,
        endDate: type === "leave" ? endDate || null : null,
        chainType,
        steps,
        note: note.trim() || null,
        templateId: templateId || null,
      });
      if (saveAsTemplate && !templateId) {
        await createTemplate.mutateAsync({ name: templateName.trim(), chainType, steps });
      }
      setCreating(false);
    } catch {
      setError("تعذّر تقديم الطلب، حاول مجدداً");
    }
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
          لا توجد طلبات بعد — اضغط "+" لإرسال طلب مع سلسلة اعتماد تحددها بنفسك
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-8">
          {myRequests.map((r) => {
            const expanded = expandedId === r.id;
            return (
              <Card key={r.id} className="cursor-pointer" onClick={() => setExpandedId(expanded ? null : r.id)}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.type && <span className="text-[10px] text-ink-soft bg-bg rounded-full px-1.5 py-0.5">{TYPE_LABEL[r.type]}</span>}
                      <span className="text-sm font-bold text-ink truncate">{r.title}</span>
                      <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${STATUS_TONE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                    </div>
                    {r.startDate && (
                      <div className="text-xs text-ink-soft mt-1">
                        {fmt(r.startDate)} {r.endDate ? `→ ${fmt(r.endDate)}` : ""}
                      </div>
                    )}
                    {r.description && <div className="text-xs text-ink-soft mt-1">{r.description}</div>}
                  </div>
                  {expanded ? <ChevronUp size={16} className="text-ink-soft shrink-0" /> : <ChevronDown size={16} className="text-ink-soft shrink-0" />}
                </div>

                {expanded && (
                  <div className="mt-3 pt-3 border-t border-line/60 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
                    <ChainStepsSection
                      requestId={r.id}
                      currentUserId={profile.id}
                      departments={departments}
                      members={members}
                      profilesById={profilesById}
                      isOrgManager={isOrgManager}
                    />
                    <RequestAttachmentsSection requestId={r.id} canEdit={r.userId === profile.id || isOrgManager} />
                    <RecordAuditTimeline tableName="internal_requests" recordId={r.id} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-bold text-ink">طلبات موجَّهة إليّ</h2>
        <StatCard label="معلّقة" value={pendingInbox.length} tone={pendingInbox.length > 0 ? "warn" : undefined} />
      </div>

      {inboxRequests.length === 0 ? (
        <div className="bg-panel border border-dashed border-line rounded-xl p-8 text-center text-sm text-ink-soft">
          لا توجد طلبات موجَّهة إليك حالياً
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {inboxRequests.map((r) => {
            const expanded = expandedId === r.id;
            return (
              <Card key={r.id} className="cursor-pointer" onClick={() => setExpandedId(expanded ? null : r.id)}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {r.type && <span className="text-[10px] text-ink-soft bg-bg rounded-full px-1.5 py-0.5">{TYPE_LABEL[r.type]}</span>}
                      <span className="text-sm font-bold text-ink">{inboxProfiles.get(r.userId)?.fullName ?? "—"}</span>
                      <span className="text-xs text-ink-soft">— {r.title}</span>
                      <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${STATUS_TONE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                    </div>
                    {r.startDate && (
                      <div className="text-xs text-ink-soft mb-1">
                        {fmt(r.startDate)} {r.endDate ? `→ ${fmt(r.endDate)}` : ""}
                      </div>
                    )}
                    {r.description && <div className="text-xs text-ink-soft">{r.description}</div>}
                  </div>
                  {expanded ? <ChevronUp size={16} className="text-ink-soft shrink-0" /> : <ChevronDown size={16} className="text-ink-soft shrink-0" />}
                </div>

                {expanded && (
                  <div className="mt-3 pt-3 border-t border-line/60 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
                    <ChainStepsSection
                      requestId={r.id}
                      currentUserId={profile.id}
                      departments={departments}
                      members={members}
                      profilesById={profilesById}
                      isOrgManager={isOrgManager}
                    />
                    <RequestAttachmentsSection requestId={r.id} canEdit={isOrgManager} />
                    <RecordAuditTimeline tableName="internal_requests" recordId={r.id} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {creating && (
        <Modal title="طلب جديد" onClose={() => setCreating(false)}>
          <FieldLabel>العنوان</FieldLabel>
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="mb-3" />

          <FieldLabel>نوع الطلب</FieldLabel>
          <select value={type} onChange={(e) => setType(e.target.value as InternalRequestType)} className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink">
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

          <FieldLabel>تفاصيل إضافية (اختياري)</FieldLabel>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border resize-y"
          />
          <div className="mb-3" />

          <FieldLabel>قالب سلسلة الاعتماد</FieldLabel>
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink">
            <option value="">بدون قالب — بناء السلسلة يدوياً</option>
            {templates.map(({ template }) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.chainType === "network" ? "شبكية" : "خطية"})
              </option>
            ))}
          </select>
          <div className="mb-3" />

          {!templateId && (
            <>
              <FieldLabel>نوع السلسلة</FieldLabel>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setChainType("linear")}
                  className={`text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer border flex-1 ${
                    chainType === "linear" ? "border-ink bg-ink text-white" : "border-line/60 bg-panel text-ink-soft"
                  }`}
                >
                  خطية — تسلسل بسيط
                </button>
                <button
                  type="button"
                  onClick={() => setChainType("network")}
                  className={`text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer border flex-1 ${
                    chainType === "network" ? "border-ink bg-ink text-white" : "border-line/60 bg-panel text-ink-soft"
                  }`}
                >
                  شبكية — تسمح بالإرجاع لمرحلة سابقة
                </button>
              </div>

              <ChainBuilder departments={departments} members={members} steps={steps} onChange={setSteps} />
              <div className="mb-3" />

              <label className="flex items-center gap-2 text-xs text-ink-soft mb-2">
                <input type="checkbox" checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)} />
                احفظ هذه السلسلة كقالب لإعادة الاستخدام لاحقاً
              </label>
              {saveAsTemplate && <TextInput value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="اسم القالب" />}
              <div className="mb-3" />
            </>
          )}

          <FieldLabel>ملاحظة/تبرير (اختياري)</FieldLabel>
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="سياق إضافي للمعتمدين" />

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
