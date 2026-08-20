import { Pencil } from "lucide-react";
import { DEPARTMENT_TYPE_COLOR } from "@/features/company/departmentTypeLabels";
import type { Department, DepartmentMember, MemberRole } from "@/types/domain";

const ROLE_LABEL: Record<string, string> = { member: "عضو", head: "رئيس القسم" };

function roleLabel(dept: { headLabel: string | null; memberLabel: string | null } | undefined, role: MemberRole): string {
  if (!dept) return ROLE_LABEL[role];
  if (role === "head") return dept.headLabel || ROLE_LABEL.head;
  return dept.memberLabel || ROLE_LABEL.member;
}

function DeptCard({
  dept,
  members,
  canEdit,
  onEdit,
}: {
  dept: Department;
  members: DepartmentMember[];
  canEdit: boolean;
  onEdit: (dept: Department) => void;
}) {
  const deptMembers = members.filter((m) => m.departmentId === dept.id);
  const head = deptMembers.find((m) => m.role === "head");
  const rest = deptMembers.filter((m) => m.role !== "head");

  return (
    <div
      className={`relative bg-panel rounded-xl px-4 py-3 shadow-sm w-[190px] text-center ${
        head ? "border border-line/70" : "border border-dashed border-line"
      }`}
    >
      {canEdit && (
        <button
          type="button"
          onClick={() => onEdit(dept)}
          title="تعديل القسم"
          className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-panel border border-line/70 text-ink-soft flex items-center justify-center cursor-pointer shadow-sm hover:text-ink"
        >
          <Pencil size={12} />
        </button>
      )}
      <div className="flex items-center justify-center gap-1.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DEPARTMENT_TYPE_COLOR[dept.type] }} />
        <span className="text-sm font-bold text-ink truncate">{dept.name}</span>
      </div>
      {head ? (
        <div className="text-xs text-ink-soft mt-1 truncate">
          {roleLabel(dept, "head")}: {head.fullName}
        </div>
      ) : (
        <div className="text-xs text-ink-soft/70 mt-1">بدون {roleLabel(dept, "head")}</div>
      )}
      {rest.length > 0 && <div className="text-[11px] text-ink-soft/80 mt-0.5">+{rest.length} أعضاء آخرين</div>}
    </div>
  );
}

function OrgTreeNode({
  dept,
  departments,
  members,
  canEdit,
  onEdit,
}: {
  dept: Department;
  departments: Department[];
  members: DepartmentMember[];
  canEdit: boolean;
  onEdit: (dept: Department) => void;
}) {
  const children = departments.filter((d) => d.parentDepartmentId === dept.id);
  return (
    <li>
      <DeptCard dept={dept} members={members} canEdit={canEdit} onEdit={onEdit} />
      {children.length > 0 && (
        <ul>
          {children.map((c) => (
            <OrgTreeNode key={c.id} dept={c} departments={departments} members={members} canEdit={canEdit} onEdit={onEdit} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OrgTreeChart({
  companyName,
  roots,
  departments,
  members,
  canEdit,
  onEdit,
}: {
  companyName: string;
  roots: Department[];
  departments: Department[];
  members: DepartmentMember[];
  canEdit: boolean;
  onEdit: (dept: Department) => void;
}) {
  return (
    <div dir="ltr" className="overflow-x-auto">
      <ul className="org-tree" style={{ minWidth: "fit-content" }}>
        <li>
          <div className="bg-navy rounded-xl px-5 py-3 text-white text-sm font-bold shadow-sm w-[190px] text-center">
            <span dir="rtl">{companyName}</span>
          </div>
          {roots.length > 0 && (
            <ul>
              {roots.map((r) => (
                <OrgTreeNode key={r.id} dept={r} departments={departments} members={members} canEdit={canEdit} onEdit={onEdit} />
              ))}
            </ul>
          )}
        </li>
      </ul>
    </div>
  );
}
