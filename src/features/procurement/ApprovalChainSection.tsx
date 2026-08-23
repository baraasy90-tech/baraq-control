import { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, CircleCheck, CircleX, CircleDashed, CircleEllipsis } from "lucide-react";
import { SecondaryButton, PrimaryButton, IconButton, FieldLabel, TextInput, ErrorText } from "@/components/ui";
import type { ApprovalChainStep, Department, DepartmentMember } from "@/types/domain";
import type { ApprovalChainBundle } from "@/features/procurement/api/useApprovalChains";
import type { ChainStepInput } from "@/features/procurement/api/useApprovalChainActions";
import {
  useSubmitPurchaseChain,
  useRouteApprovalStep,
  useInsertApprovalStep,
  useReviewApprovalStep,
  useSendApprovalStepBack,
} from "@/features/procurement/api/useApprovalChainActions";
import type { MiniProfile } from "@/features/company/api/useProfilesByIds";
import type { CompanyMember } from "@/features/company/api/useCompanyMembers";
import { fmt } from "@/utils/dates";
import { getErrorMessage } from "@/utils/errors";

function personName(userId: string | null, profilesById: Map<string, MiniProfile>): string {
  if (!userId) return "—";
  return profilesById.get(userId)?.fullName ?? "—";
}

function departmentName(departmentId: string | null, departments: Department[]): string {
  if (!departmentId) return "—";
  return departments.find((d) => d.id === departmentId)?.name ?? "—";
}

function StepTargetPicker({
  departmentId,
  userId,
  onChangeDepartment,
  onChangeUser,
  departments,
  members,
}: {
  departmentId: string | null;
  userId: string | null;
  onChangeDepartment: (id: string | null) => void;
  onChangeUser: (id: string | null) => void;
  departments: Department[];
  members: DepartmentMember[];
}) {
  const deptMembers = departmentId ? members.filter((m) => m.departmentId === departmentId) : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
      <select
        value={departmentId ?? ""}
        onChange={(e) => {
          onChangeDepartment(e.target.value || null);
          onChangeUser(null);
        }}
        className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink"
      >
        <option value="">اختر القسم...</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <select
        value={userId ?? ""}
        onChange={(e) => onChangeUser(e.target.value || null)}
        disabled={!departmentId}
        className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink disabled:opacity-50"
      >
        <option value="">أي مسؤول بالقسم (بدون تحديد)</option>
        {deptMembers.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.fullName}
          </option>
        ))}
      </select>
    </div>
  );
}

function ChainBuilder({
  departments,
  members,
  initialSteps,
  onSubmit,
  pending,
}: {
  departments: Department[];
  members: DepartmentMember[];
  initialSteps: ChainStepInput[];
  onSubmit: (steps: ChainStepInput[], note: string | null) => void;
  pending: boolean;
}) {
  const [steps, setSteps] = useState<ChainStepInput[]>(initialSteps.length > 0 ? initialSteps : [{ departmentId: null, userId: null }]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const updateStep = (index: number, patch: Partial<ChainStepInput>) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };
  const removeStep = (index: number) => setSteps((prev) => prev.filter((_, i) => i !== index));
  const addStep = () => setSteps((prev) => [...prev, { departmentId: null, userId: null }]);
  const moveStep = (index: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSubmit = () => {
    setError("");
    if (steps.some((s) => !s.departmentId && !s.userId)) {
      setError("لازم تحديد قسم أو شخص لكل مرحلة اعتماد");
      return;
    }
    onSubmit(steps, note.trim() || null);
  };

  return (
    <div className="mt-3 pt-3 border-t border-line/60">
      <p className="text-xs text-ink-soft mb-2">
        حدد الجهات المطلوب اعتمادها بالترتيب — كل مرحلة تنتظر اعتماد اللي قبلها. لو ما تعرف الشخص بالضبط، اختر القسم فقط
        وسيقوم رئيس القسم بتوجيه الطلب للمسؤول.
      </p>
      <div className="flex flex-col gap-2 mb-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs font-bold text-ink-soft w-5 shrink-0">{i + 1}</span>
            <StepTargetPicker
              departmentId={step.departmentId}
              userId={step.userId}
              onChangeDepartment={(id) => updateStep(i, { departmentId: id })}
              onChangeUser={(id) => updateStep(i, { userId: id })}
              departments={departments}
              members={members}
            />
            <div className="flex items-center gap-0.5 shrink-0">
              <IconButton icon={ArrowUp} label="تحريك للأعلى" onClick={() => moveStep(i, -1)} />
              <IconButton icon={ArrowDown} label="تحريك للأسفل" onClick={() => moveStep(i, 1)} />
              <IconButton icon={Trash2} label="حذف المرحلة" tone="critical" onClick={() => removeStep(i)} />
            </div>
          </div>
        ))}
      </div>
      <SecondaryButton onClick={addStep} className="text-xs px-3 py-1.5 mb-3 inline-flex items-center gap-1.5">
        <Plus size={14} strokeWidth={2.5} /> إضافة مرحلة اعتماد
      </SecondaryButton>

      <FieldLabel>ملاحظة/تبرير (اختياري)</FieldLabel>
      <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="سياق إضافي للمعتمدين" />

      <ErrorText>{error}</ErrorText>
      <PrimaryButton onClick={handleSubmit} disabled={pending} className="w-auto px-4 py-2 text-xs mt-3">
        {pending ? "جارٍ التقديم..." : "تقديم للاعتماد"}
      </PrimaryButton>
    </div>
  );
}

function StepStatusIcon({ status }: { status: ApprovalChainStep["status"] }) {
  if (status === "approved") return <CircleCheck size={16} className="text-accent shrink-0" />;
  if (status === "rejected") return <CircleX size={16} className="text-critical shrink-0" />;
  if (status === "skipped") return <CircleDashed size={16} className="text-ink-soft shrink-0" />;
  return <CircleEllipsis size={16} className="text-warn shrink-0" />;
}

function isStepActive(step: ApprovalChainStep, allSteps: ApprovalChainStep[]): boolean {
  if (step.status !== "pending") return false;
  return !allSteps.some((s) => s.stepOrder < step.stepOrder && s.status !== "approved");
}

function StepRow({
  step,
  active,
  departments,
  members,
  membersOfDept,
  companyMembers,
  profilesById,
  canRoute,
  canAct,
  requestId,
  projectId,
  previousStep,
  canSendBack,
}: {
  step: ApprovalChainStep;
  active: boolean;
  departments: Department[];
  members: DepartmentMember[];
  profilesById: Map<string, MiniProfile>;
  currentUserId: string;
  canRoute: boolean;
  canAct: boolean;
  requestId: string;
  projectId: string;
  membersOfDept: DepartmentMember[];
  companyMembers: CompanyMember[];
  previousStep: ApprovalChainStep | null;
  canSendBack: boolean;
}) {
  const routeStep = useRouteApprovalStep(requestId, projectId);
  const reviewStep = useReviewApprovalStep(requestId, projectId);
  const insertStep = useInsertApprovalStep(requestId, projectId);
  const sendBackStep = useSendApprovalStepBack(requestId, projectId);

  const routeCandidates =
    membersOfDept.length > 0 ? membersOfDept.map((m) => ({ id: m.userId, fullName: m.fullName })) : companyMembers;
  const routeFallbackToCompany = membersOfDept.length === 0;

  const [routeUserId, setRouteUserId] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [addingExtra, setAddingExtra] = useState(false);
  const [extraDept, setExtraDept] = useState<string | null>(null);
  const [extraUser, setExtraUser] = useState<string | null>(null);
  const [extraNote, setExtraNote] = useState("");
  const [error, setError] = useState("");

  const label = step.departmentId
    ? step.assignedUserId
      ? `${departmentName(step.departmentId, departments)} — ${personName(step.assignedUserId, profilesById)}`
      : departmentName(step.departmentId, departments)
    : personName(step.assignedUserId, profilesById);

  return (
    <div className={`rounded-lg px-3 py-2 ${active ? "bg-warn-bg" : "bg-bg"}`}>
      <div className="flex items-center gap-2">
        <StepStatusIcon status={step.status} />
        <span className="text-sm text-ink flex-1">{label}</span>
        {step.insertedBy && <span className="text-[10px] text-ink-soft bg-panel rounded-full px-1.5 py-0.5">أُضيفت لاحقاً</span>}
      </div>
      {step.status === "approved" && step.actedAt && (
        <div className="text-xs text-ink-soft mt-1 mr-6">اعتمد بتاريخ {fmt(step.actedAt)}{step.note ? ` — ${step.note}` : ""}</div>
      )}
      {step.status === "rejected" && (
        <div className="text-xs text-critical mt-1 mr-6">سبب الرفض: {step.note}</div>
      )}
      {active && canRoute && (
        <div className="mt-2 mr-6">
          <div className="flex items-center gap-2">
            <select
              value={routeUserId}
              onChange={(e) => setRouteUserId(e.target.value)}
              className="bg-panel border border-line/60 rounded-lg px-2 py-1.5 text-xs text-ink"
            >
              <option value="">وجّه إلى...</option>
              {routeCandidates.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </select>
            <SecondaryButton
              disabled={!routeUserId || routeStep.isPending}
              onClick={() => routeStep.mutate({ stepId: step.id, userId: routeUserId })}
              className="text-xs px-3 py-1.5"
            >
              توجيه
            </SecondaryButton>
          </div>
          {routeFallbackToCompany && (
            <p className="text-[11px] text-warn mt-1">
              لا يوجد أعضاء مسجّلين بهذا القسم بعد — القائمة تعرض كل أعضاء الشركة مؤقتاً.
            </p>
          )}
        </div>
      )}
      {active && canAct && (
        <div className="mt-2 mr-6">
          <TextInput value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="ملاحظة (إلزامية عند الرفض)" />
          <div className="flex gap-2 mt-2">
            <PrimaryButton
              onClick={() => reviewStep.mutate({ stepId: step.id, approve: true, note: reviewNote.trim() || null })}
              disabled={reviewStep.isPending}
              className="w-auto px-3 py-1.5 text-xs"
            >
              اعتماد
            </PrimaryButton>
            <SecondaryButton
              onClick={() => {
                if (!reviewNote.trim()) {
                  setError("لازم توضيح سبب الرفض");
                  return;
                }
                setError("");
                reviewStep.mutate({ stepId: step.id, approve: false, note: reviewNote.trim() });
              }}
              disabled={reviewStep.isPending}
              className="text-xs px-3 py-1.5"
            >
              رفض
            </SecondaryButton>
            <SecondaryButton onClick={() => setAddingExtra((v) => !v)} className="text-xs px-3 py-1.5">
              إضافة معتمد إضافي قبلي
            </SecondaryButton>
            {canSendBack && previousStep && (
              <SecondaryButton
                onClick={() => {
                  if (!reviewNote.trim()) {
                    setError("لازم توضيح سبب الإرجاع بخانة الملاحظة");
                    return;
                  }
                  setError("");
                  sendBackStep.mutate({ stepId: step.id, targetStepId: previousStep.id, note: reviewNote.trim() });
                }}
                disabled={sendBackStep.isPending}
                className="text-xs px-3 py-1.5"
              >
                إرجاع للمرحلة السابقة للتعديل
              </SecondaryButton>
            )}
          </div>
          <ErrorText>{error}</ErrorText>

          {addingExtra && (
            <div className="mt-2 pt-2 border-t border-line/60">
              <p className="text-xs text-ink-soft mb-2">لو سياسة الشركة تلزم اعتماد جهة إضافية قبلك — حددها هنا</p>
              <StepTargetPicker
                departmentId={extraDept}
                userId={extraUser}
                onChangeDepartment={setExtraDept}
                onChangeUser={setExtraUser}
                departments={departments}
                members={members}
              />
              <TextInput value={extraNote} onChange={(e) => setExtraNote(e.target.value)} placeholder="سبب الإضافة (اختياري)" className="mt-2" />
              <SecondaryButton
                onClick={() => {
                  insertStep.mutate({ stepId: step.id, departmentId: extraDept, userId: extraUser, note: extraNote.trim() || null });
                  setAddingExtra(false);
                  setExtraDept(null);
                  setExtraUser(null);
                  setExtraNote("");
                }}
                disabled={(!extraDept && !extraUser) || insertStep.isPending}
                className="text-xs px-3 py-1.5 mt-2"
              >
                إضافة
              </SecondaryButton>
            </div>
          )}
        </div>
      )}
      {active && !canRoute && !canAct && (
        <div className="text-xs text-ink-soft mt-1 mr-6">
          {step.assignedUserId ? `بانتظار اعتماد ${personName(step.assignedUserId, profilesById)}` : "بانتظار توجيه رئيس القسم"}
        </div>
      )}
    </div>
  );
}

export function ApprovalStepsList({
  steps,
  chainType,
  requestId,
  projectId,
  currentUserId,
  departments,
  members,
  companyMembers,
  profilesById,
  isOrgManager,
}: {
  steps: ApprovalChainStep[];
  chainType: "linear" | "network";
  requestId: string;
  projectId: string;
  currentUserId: string;
  departments: Department[];
  members: DepartmentMember[];
  companyMembers: CompanyMember[];
  profilesById: Map<string, MiniProfile>;
  isOrgManager: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {steps.map((step) => {
        const active = isStepActive(step, steps);
        const isHeadOfDept =
          !!step.departmentId &&
          (isOrgManager || members.some((m) => m.userId === currentUserId && m.departmentId === step.departmentId && m.role === "head"));
        const canRoute = active && !step.assignedUserId && isHeadOfDept;
        const canAct = active && !!step.assignedUserId && (step.assignedUserId === currentUserId || isOrgManager);
        const previousStep = steps.find((s) => s.stepOrder === step.stepOrder - 1) ?? null;
        return (
          <StepRow
            key={step.id}
            step={step}
            active={active}
            departments={departments}
            members={members}
            membersOfDept={step.departmentId ? members.filter((m) => m.departmentId === step.departmentId) : []}
            companyMembers={companyMembers}
            profilesById={profilesById}
            currentUserId={currentUserId}
            canRoute={canRoute}
            canAct={canAct}
            requestId={requestId}
            projectId={projectId}
            previousStep={previousStep}
            canSendBack={chainType === "network" && step.stepOrder > 1}
          />
        );
      })}
    </div>
  );
}

export function ApprovalChainSection({
  title,
  requestId,
  projectId,
  canEdit,
  priceEntered,
  bundles,
  currentUserId,
  departments,
  members,
  companyMembers,
  profilesById,
  isOrgManager,
}: {
  title: string;
  requestId: string;
  projectId: string;
  canEdit: boolean;
  priceEntered: boolean;
  bundles: ApprovalChainBundle[];
  currentUserId: string;
  departments: Department[];
  members: DepartmentMember[];
  companyMembers: CompanyMember[];
  profilesById: Map<string, MiniProfile>;
  isOrgManager: boolean;
}) {
  const submit = useSubmitPurchaseChain(projectId);
  const [showBuilder, setShowBuilder] = useState(false);
  const [error, setError] = useState("");

  const latest = bundles.length > 0 ? bundles[bundles.length - 1] : null;

  const handleSubmit = async (steps: ChainStepInput[], note: string | null) => {
    setError("");
    try {
      await submit.mutateAsync({ requestId, steps, note });
      setShowBuilder(false);
    } catch (err) {
      setError(getErrorMessage(err, "تعذّر تقديم سلسلة الاعتماد، حاول مجدداً"));
    }
  };

  const prefillSteps: ChainStepInput[] =
    latest?.chain.status === "rejected"
      ? latest.steps
          .filter((s) => s.status !== "skipped")
          .map((s) => ({ departmentId: s.departmentId, userId: s.assignedUserId }))
      : [];

  return (
    <div>
      <h3 className="text-xs font-bold text-ink-soft mb-2">{title}</h3>

      {latest && (
        <div className="mb-3">
          <ApprovalStepsList
            steps={latest.steps}
            chainType={latest.chain.chainType}
            requestId={requestId}
            projectId={projectId}
            currentUserId={currentUserId}
            departments={departments}
            members={members}
            companyMembers={companyMembers}
            profilesById={profilesById}
            isOrgManager={isOrgManager}
          />
        </div>
      )}

      {latest?.chain.status === "rejected" && canEdit && (
        <p className="text-xs text-ink-soft mb-2">أرفق تبريراً وأعد تقديم نفس الطلب، أو ارفع طلباً جديداً لو كانت الملاحظة جوهرية.</p>
      )}

      {canEdit && (
        <>
          {!priceEntered ? (
            <p className="text-xs text-ink-soft">أدخل السعر أولاً قبل تقديم الطلب للاعتماد.</p>
          ) : !showBuilder ? (
            <SecondaryButton onClick={() => setShowBuilder(true)} className="text-xs px-3 py-1.5">
              {latest ? "إعادة التقديم للاعتماد" : "تقديم للاعتماد"}
            </SecondaryButton>
          ) : (
            <ChainBuilder departments={departments} members={members} initialSteps={prefillSteps} onSubmit={handleSubmit} pending={submit.isPending} />
          )}
          <ErrorText>{error}</ErrorText>
        </>
      )}

      {!latest && !canEdit && <p className="text-xs text-ink-soft">لا توجد سلسلة اعتماد بعد.</p>}
    </div>
  );
}
