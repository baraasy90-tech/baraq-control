import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { SecondaryButton, IconButton, FieldLabel } from "@/components/ui";
import type { ApprovalChainStepInput, Department, DepartmentMember } from "@/types/domain";

export function StepTargetPicker({
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

/** بناء سلسلة اعتماد يدوياً: يختار رافع الطلب عدد المعتمدين وترتيبهم بالضبط — شخص أو قسم
 * لكل خطوة. لو ما يعرف الشخص بالضبط يختار القسم فقط، ورئيس القسم يوجّه لاحقاً. */
export function ChainBuilder({
  departments,
  members,
  steps,
  onChange,
}: {
  departments: Department[];
  members: DepartmentMember[];
  steps: ApprovalChainStepInput[];
  onChange: (steps: ApprovalChainStepInput[]) => void;
}) {
  const updateStep = (index: number, patch: Partial<ApprovalChainStepInput>) => {
    onChange(steps.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };
  const removeStep = (index: number) => onChange(steps.filter((_, i) => i !== index));
  const addStep = () => onChange([...steps, { departmentId: null, userId: null }]);
  const moveStep = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div>
      <FieldLabel>خطوات الاعتماد (بالترتيب)</FieldLabel>
      <p className="text-xs text-ink-soft mb-2">
        كل خطوة تنتظر اعتماد اللي قبلها. لو ما تعرف الشخص بالضبط اختر القسم فقط وسيقوم رئيسه بتوجيه الطلب للمسؤول.
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
              <IconButton icon={Trash2} label="حذف الخطوة" tone="critical" onClick={() => removeStep(i)} disabled={steps.length <= 1} />
            </div>
          </div>
        ))}
      </div>
      <SecondaryButton type="button" onClick={addStep} className="text-xs px-3 py-1.5 inline-flex items-center gap-1.5">
        <Plus size={14} strokeWidth={2.5} /> إضافة خطوة اعتماد
      </SecondaryButton>
    </div>
  );
}
