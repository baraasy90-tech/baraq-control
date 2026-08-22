import { useState } from "react";
import { CircleCheck, CircleX, CircleDashed, CircleEllipsis, Undo2 } from "lucide-react";
import { SecondaryButton, PrimaryButton, TextInput, ErrorText } from "@/components/ui";
import { ApproverBadge } from "@/features/contracts/ApproverBadge";
import { StepTargetPicker } from "@/features/requests/ChainBuilder";
import { useInternalApprovalChain } from "@/features/requests/api/useApprovalChains";
import {
  useInsertInternalApprovalStep,
  useReviewInternalApprovalStep,
  useRouteInternalApprovalStep,
  useSendBackInternalApprovalStep,
} from "@/features/requests/api/useApprovalChainActions";
import type { InternalApprovalChainStep, Department, DepartmentMember } from "@/types/domain";
import type { MiniProfile } from "@/features/company/api/useProfilesByIds";

function personName(userId: string | null, profilesById: Map<string, MiniProfile>): string {
  if (!userId) return "—";
  return profilesById.get(userId)?.fullName ?? "—";
}

function departmentName(departmentId: string | null, departments: Department[]): string {
  if (!departmentId) return "—";
  return departments.find((d) => d.id === departmentId)?.name ?? "—";
}

function isStepActive(step: InternalApprovalChainStep, allSteps: InternalApprovalChainStep[]): boolean {
  if (step.status !== "pending") return false;
  return !allSteps.some((s) => s.stepOrder < step.stepOrder && s.status !== "approved");
}

function StepStatusIcon({ status }: { status: InternalApprovalChainStep["status"] }) {
  if (status === "approved") return <CircleCheck size={16} className="text-accent shrink-0" />;
  if (status === "rejected") return <CircleX size={16} className="text-critical shrink-0" />;
  if (status === "skipped") return <CircleDashed size={16} className="text-ink-soft shrink-0" />;
  return <CircleEllipsis size={16} className="text-warn shrink-0" />;
}

function StepRow({
  step,
  allSteps,
  requestId,
  chainType,
  departments,
  members,
  profilesById,
  currentUserId,
  isOrgManager,
}: {
  step: InternalApprovalChainStep;
  allSteps: InternalApprovalChainStep[];
  requestId: string;
  chainType: "linear" | "network";
  departments: Department[];
  members: DepartmentMember[];
  profilesById: Map<string, MiniProfile>;
  currentUserId: string;
  isOrgManager: boolean;
}) {
  const active = isStepActive(step, allSteps);
  const isHeadOfDept =
    !!step.departmentId && (isOrgManager || members.some((m) => m.userId === currentUserId && m.departmentId === step.departmentId && m.role === "head"));
  const canRoute = active && !step.assignedUserId && isHeadOfDept;
  const canAct = active && !!step.assignedUserId && (step.assignedUserId === currentUserId || isOrgManager);
  const membersOfDept = step.departmentId ? members.filter((m) => m.departmentId === step.departmentId) : [];
  const priorApprovedSteps = allSteps.filter((s) => s.stepOrder < step.stepOrder && s.status === "approved");

  const routeStep = useRouteInternalApprovalStep(requestId);
  const reviewStep = useReviewInternalApprovalStep(requestId);
  const insertStep = useInsertInternalApprovalStep(requestId);
  const sendBackStep = useSendBackInternalApprovalStep(requestId);

  const [routeUserId, setRouteUserId] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [addingExtra, setAddingExtra] = useState(false);
  const [extraDept, setExtraDept] = useState<string | null>(null);
  const [extraUser, setExtraUser] = useState<string | null>(null);
  const [extraNote, setExtraNote] = useState("");
  const [sendingBack, setSendingBack] = useState(false);
  const [sendBackTarget, setSendBackTarget] = useState("");
  const [sendBackNote, setSendBackNote] = useState("");
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
        <span className="text-sm text-ink flex-1">
          مرحلة {step.stepOrder}: {label}
        </span>
        {step.insertedBy && <span className="text-[10px] text-ink-soft bg-panel rounded-full px-1.5 py-0.5">أُضيفت لاحقاً</span>}
      </div>

      {step.status === "approved" && step.assignedUserId && (
        <div className="mt-2 mr-6">
          <ApproverBadge
            label={`اعتماد المرحلة ${step.stepOrder}`}
            userId={step.assignedUserId}
            title="معتمِد"
            profiles={profilesById}
            at={step.actedAt}
            note={step.note}
          />
        </div>
      )}
      {step.status === "rejected" && <div className="text-xs text-critical mt-1 mr-6">سبب الرفض: {step.note}</div>}

      {active && canRoute && (
        <div className="mt-2 mr-6 flex items-center gap-2 flex-wrap">
          <select
            value={routeUserId}
            onChange={(e) => setRouteUserId(e.target.value)}
            className="bg-panel border border-line/60 rounded-lg px-2 py-1.5 text-xs text-ink"
          >
            <option value="">وجّه إلى...</option>
            {membersOfDept.map((m) => (
              <option key={m.userId} value={m.userId}>
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
      )}

      {active && canAct && (
        <div className="mt-2 mr-6">
          <TextInput value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="ملاحظة (إلزامية عند الرفض أو الإرجاع)" />
          <div className="flex gap-2 mt-2 flex-wrap">
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
            {chainType === "network" && priorApprovedSteps.length > 0 && (
              <SecondaryButton onClick={() => setSendingBack((v) => !v)} className="text-xs px-3 py-1.5 inline-flex items-center gap-1">
                <Undo2 size={13} /> إرجاع لمرحلة سابقة
              </SecondaryButton>
            )}
            <SecondaryButton onClick={() => setAddingExtra((v) => !v)} className="text-xs px-3 py-1.5">
              إضافة معتمد إضافي قبلي
            </SecondaryButton>
          </div>
          <ErrorText>{error}</ErrorText>

          {sendingBack && (
            <div className="mt-2 pt-2 border-t border-line/60">
              <p className="text-xs text-ink-soft mb-2">اختر المرحلة اللي تبي ترجّع الطلب لها بدل رفضه نهائياً</p>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={sendBackTarget}
                  onChange={(e) => setSendBackTarget(e.target.value)}
                  className="bg-panel border border-line/60 rounded-lg px-2 py-1.5 text-xs text-ink"
                >
                  <option value="">اختر المرحلة...</option>
                  {priorApprovedSteps.map((s) => (
                    <option key={s.id} value={s.id}>
                      مرحلة {s.stepOrder}: {s.departmentId ? departmentName(s.departmentId, departments) : ""}
                      {s.assignedUserId ? ` — ${personName(s.assignedUserId, profilesById)}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <TextInput value={sendBackNote} onChange={(e) => setSendBackNote(e.target.value)} placeholder="سبب الإرجاع (إلزامي)" className="mt-2" />
              <SecondaryButton
                onClick={() => {
                  if (!sendBackTarget || !sendBackNote.trim()) {
                    setError("لازم اختيار المرحلة وتوضيح سبب الإرجاع");
                    return;
                  }
                  setError("");
                  sendBackStep.mutate({ stepId: step.id, targetStepId: sendBackTarget, note: sendBackNote.trim() });
                  setSendingBack(false);
                  setSendBackTarget("");
                  setSendBackNote("");
                }}
                disabled={sendBackStep.isPending}
                className="text-xs px-3 py-1.5 mt-2"
              >
                إرجاع
              </SecondaryButton>
            </div>
          )}

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

export function ChainStepsSection({
  requestId,
  currentUserId,
  departments,
  members,
  profilesById,
  isOrgManager,
}: {
  requestId: string;
  currentUserId: string;
  departments: Department[];
  members: DepartmentMember[];
  profilesById: Map<string, MiniProfile>;
  isOrgManager: boolean;
}) {
  const chainQuery = useInternalApprovalChain(requestId);
  const bundle = chainQuery.data;

  if (chainQuery.isLoading) return <p className="text-xs text-ink-soft">جارٍ التحميل...</p>;
  if (!bundle) return <p className="text-xs text-ink-soft">لا توجد سلسلة اعتماد لهذا الطلب.</p>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-xs font-bold text-ink-soft">سلسلة الاعتماد</h4>
        <span className="text-[10px] text-ink-soft bg-panel rounded-full px-1.5 py-0.5">
          {bundle.chain.chainType === "network" ? "شبكية (تسمح بالإرجاع)" : "خطية"}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {bundle.steps.map((step) => (
          <StepRow
            key={step.id}
            step={step}
            allSteps={bundle.steps}
            requestId={requestId}
            chainType={bundle.chain.chainType}
            departments={departments}
            members={members}
            profilesById={profilesById}
            currentUserId={currentUserId}
            isOrgManager={isOrgManager}
          />
        ))}
      </div>
    </div>
  );
}
