import { useLayoutEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { computeBranchColors } from "@/features/company/lib/branchColors";
import type { Department, DepartmentMember, MemberRole, OrganizationalLevel, OrganizationalClassification } from "@/types/domain";

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
  color,
  isRoot,
  levelById,
  classificationById,
}: {
  dept: Department;
  members: DepartmentMember[];
  canEdit: boolean;
  onEdit: (dept: Department) => void;
  color: string;
  isRoot: boolean;
  levelById: Map<string, OrganizationalLevel>;
  classificationById: Map<string, OrganizationalClassification>;
}) {
  const deptMembers = members.filter((m) => m.departmentId === dept.id);
  const head = deptMembers.find((m) => m.role === "head");
  const rest = deptMembers.filter((m) => m.role !== "head");
  const headLevel = head?.organizationalLevelId ? levelById.get(head.organizationalLevelId) : undefined;
  const headClassification = head?.organizationalClassificationId
    ? classificationById.get(head.organizationalClassificationId)
    : undefined;

  return (
    <div
      className={`relative bg-panel rounded-xl px-4 py-3 shadow-sm w-[190px] text-center border-r-[3px] ${
        head ? "border border-line/70" : "border border-dashed border-line"
      }`}
      style={{ borderRightColor: color }}
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
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <span
          className={`text-sm truncate ${isRoot ? "font-bold" : "font-normal"}`}
          style={{ color }}
        >
          {dept.name}
        </span>
      </div>
      {head ? (
        <div className="text-xs text-ink-soft mt-1 truncate">
          {head.title || roleLabel(dept, "head")}: {head.fullName}
        </div>
      ) : (
        <div className="text-xs text-ink-soft/70 mt-1">بدون {roleLabel(dept, "head")}</div>
      )}
      {(headLevel || headClassification) && (
        <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
          {headLevel && (
            <span className="text-[10px] text-accent bg-accent-bg rounded-full px-1.5 py-0.5">{headLevel.name}</span>
          )}
          {headClassification && (
            <span className="text-[10px] text-warn bg-warn-bg rounded-full px-1.5 py-0.5">{headClassification.name}</span>
          )}
        </div>
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
  colorMap,
  depth,
  levelById,
  classificationById,
}: {
  dept: Department;
  departments: Department[];
  members: DepartmentMember[];
  canEdit: boolean;
  onEdit: (dept: Department) => void;
  colorMap: Map<string, string>;
  depth: number;
  levelById: Map<string, OrganizationalLevel>;
  classificationById: Map<string, OrganizationalClassification>;
}) {
  const children = departments.filter((d) => d.parentDepartmentId === dept.id);
  return (
    <li>
      <DeptCard
        dept={dept}
        members={members}
        canEdit={canEdit}
        onEdit={onEdit}
        color={colorMap.get(dept.id) ?? "#5B6472"}
        isRoot={depth === 0}
        levelById={levelById}
        classificationById={classificationById}
      />
      {children.length > 0 && (
        <ul>
          {children.map((c) => (
            <OrgTreeNode
              key={c.id}
              dept={c}
              departments={departments}
              members={members}
              canEdit={canEdit}
              onEdit={onEdit}
              colorMap={colorMap}
              depth={depth + 1}
              levelById={levelById}
              classificationById={classificationById}
            />
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
  levels = [],
  classifications = [],
}: {
  companyName: string;
  roots: Department[];
  departments: Department[];
  members: DepartmentMember[];
  canEdit: boolean;
  onEdit: (dept: Department) => void;
  levels?: OrganizationalLevel[];
  classifications?: OrganizationalClassification[];
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLUListElement>(null);
  const [fit, setFit] = useState({ scale: 1, naturalWidth: 0, naturalHeight: 0 });
  const colorMap = computeBranchColors(roots, departments);
  const levelById = new Map(levels.map((l) => [l.id, l]));
  const classificationById = new Map(classifications.map((c) => [c.id, c]));

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const tree = treeRef.current;
    if (!wrapper || !tree) return;

    const update = () => {
      // scrollWidth/scrollHeight يعكسان الحجم الطبيعي دائماً بغض النظر عن أي transform
      // مطبّق على عنصر أب — القياس هنا دقيق دون الحاجة لإلغاء أي تصغير سابق يدوياً،
      // بشرط ألا يضغط flex العناصر لتتقلّص (محلول عبر flex-shrink:0 بملف الأنماط).
      const naturalWidth = tree.scrollWidth;
      const naturalHeight = tree.scrollHeight;
      const availableWidth = wrapper.clientWidth;
      const scale = naturalWidth > availableWidth && availableWidth > 0 ? availableWidth / naturalWidth : 1;
      setFit({ scale, naturalWidth, naturalHeight });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [roots, departments, members]);

  const needsShrink = fit.scale < 1;

  return (
    <div
      ref={wrapperRef}
      className="w-full overflow-auto"
      style={{ height: needsShrink ? fit.naturalHeight * fit.scale : undefined }}
    >
      <div
        dir="ltr"
        style={
          needsShrink
            ? { transform: `scale(${fit.scale})`, transformOrigin: "top left", width: fit.naturalWidth }
            : undefined
        }
      >
        <ul ref={treeRef} className="org-tree">
          <li>
            <div className="bg-navy rounded-xl px-5 py-3 text-white text-sm font-bold shadow-sm w-[190px] text-center">
              <span dir="rtl">{companyName}</span>
            </div>
            {roots.length > 0 && (
              <ul>
                {roots.map((r) => (
                  <OrgTreeNode
                    key={r.id}
                    dept={r}
                    departments={departments}
                    members={members}
                    canEdit={canEdit}
                    onEdit={onEdit}
                    colorMap={colorMap}
                    depth={0}
                    levelById={levelById}
                    classificationById={classificationById}
                  />
                ))}
              </ul>
            )}
          </li>
        </ul>
      </div>
    </div>
  );
}
