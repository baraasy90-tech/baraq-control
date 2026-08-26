import { useLayoutEffect, useRef, useState } from "react";
import { Pencil, ChevronDown, ChevronUp, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { computeBranchColors } from "@/features/company/lib/branchColors";
import type { Department, DepartmentMember, MemberRole, OrganizationalLevel, OrganizationalClassification } from "@/types/domain";

export type ChartMember = DepartmentMember & { directManagerEmployeeId: string | null };

const ROLE_LABEL: Record<string, string> = { member: "عضو", head: "رئيس القسم" };
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.1;

function roleLabel(dept: { headLabel: string | null; memberLabel: string | null } | undefined, role: MemberRole): string {
  if (!dept) return ROLE_LABEL[role];
  if (role === "head") return dept.headLabel || ROLE_LABEL.head;
  return dept.memberLabel || ROLE_LABEL.member;
}

function levelOrder(m: ChartMember, levelById: Map<string, OrganizationalLevel>): number {
  const order = m.organizationalLevelId ? levelById.get(m.organizationalLevelId)?.orderIndex : undefined;
  return order ?? Number.MAX_SAFE_INTEGER;
}

/** يبني تفرّعاً حقيقياً بين أعضاء نفس القسم بدل عرضهم جميعاً بمستوى واحد مسطّح:
 * 1) إن كان لعضو "مدير مباشر" محدَّد صراحة وهو ضمن نفس مجموعة الأعضاء، يتفرّع منه.
 * 2) وإلا، إن وُجد عضو بمستوى إداري (is_management_level) بلا مدير مباشر محدَّد ضمن
 *    المجموعة، يُعتبر المدير الافتراضي الذي يتفرّع منه بقية الأعضاء غير الإداريين
 *    الذين لا مدير محدَّد لهم هم أيضاً — هذا يحقق طلب "الشخص بمستوى مدير قسم يظهر أعلى
 *    من البقية" دون الحاجة لتحديد يدوي في كل حالة.
 * 3) الباقي (بلا مدير محدَّد ولا مدير افتراضي متاح) يبقى بمستوى الجذر. */
export function buildMemberTree(
  branchMembers: ChartMember[],
  levelById: Map<string, OrganizationalLevel>
): { roots: ChartMember[]; childrenOf: Map<string, ChartMember[]> } {
  const byEmployeeId = new Map(branchMembers.filter((m) => m.employeeId).map((m) => [m.employeeId!, m]));
  const explicitlyManaged = new Set<string>(); // employeeId لكل من له مدير محدَّد ضمن المجموعة
  const childrenOf = new Map<string, ChartMember[]>();

  const addChild = (parentId: string, child: ChartMember) => {
    childrenOf.set(parentId, [...(childrenOf.get(parentId) ?? []), child]);
  };

  for (const m of branchMembers) {
    const managerId = m.directManagerEmployeeId;
    const manager = managerId ? byEmployeeId.get(managerId) : undefined;
    if (manager && manager.id !== m.id) {
      addChild(manager.id, m);
      if (m.employeeId) explicitlyManaged.add(m.employeeId);
    }
  }

  const managementPeers = branchMembers
    .filter((m) => (m.organizationalLevelId ? levelById.get(m.organizationalLevelId)?.isManagementLevel : false))
    .sort((a, b) => levelOrder(a, levelById) - levelOrder(b, levelById));
  const defaultManager = managementPeers.find((m) => !(m.employeeId && explicitlyManaged.has(m.employeeId)));

  const isManagementLevel = (m: ChartMember) =>
    !!(m.organizationalLevelId && levelById.get(m.organizationalLevelId)?.isManagementLevel);

  const roots: ChartMember[] = [];
  for (const m of branchMembers) {
    const managerId = m.directManagerEmployeeId;
    const hasExplicitManagerInGroup = managerId && byEmployeeId.has(managerId) && byEmployeeId.get(managerId)!.id !== m.id;
    if (hasExplicitManagerInGroup) continue; // already nested above
    // فقط الأعضاء غير الإداريين بلا مدير محدَّد يُنسبون تلقائياً للمدير الافتراضي —
    // أي مدير قسم آخر (حتى بلا مدير مباشر محدَّد له) يبقى نداً مستقلاً بمستوى الجذر.
    if (defaultManager && m.id !== defaultManager.id && !isManagementLevel(m)) {
      addChild(defaultManager.id, m);
    } else {
      roots.push(m);
    }
  }

  for (const list of childrenOf.values()) list.sort((a, b) => levelOrder(a, levelById) - levelOrder(b, levelById));
  roots.sort((a, b) => levelOrder(a, levelById) - levelOrder(b, levelById));

  return { roots, childrenOf };
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
  collapsible,
  collapsed,
  onToggleCollapse,
}: {
  dept: Department;
  members: ChartMember[];
  canEdit: boolean;
  onEdit: (dept: Department) => void;
  color: string;
  isRoot: boolean;
  levelById: Map<string, OrganizationalLevel>;
  classificationById: Map<string, OrganizationalClassification>;
  collapsible: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const deptMembers = members.filter((m) => m.departmentId === dept.id);
  const head = deptMembers.find((m) => m.role === "head");
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
      {collapsible && (
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? "إظهار الفروع" : "طي الفروع"}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-panel border border-line/70 text-ink-soft flex items-center justify-center cursor-pointer shadow-sm hover:text-ink"
        >
          {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
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
      {collapsible && collapsed && <div className="text-[10px] text-ink-soft/70 mt-1">— مطوي —</div>}
    </div>
  );
}

function MemberLeafCard({
  member,
  color,
  levelById,
  classificationById,
}: {
  member: ChartMember;
  color: string;
  levelById: Map<string, OrganizationalLevel>;
  classificationById: Map<string, OrganizationalClassification>;
}) {
  const level = member.organizationalLevelId ? levelById.get(member.organizationalLevelId) : undefined;
  const classification = member.organizationalClassificationId
    ? classificationById.get(member.organizationalClassificationId)
    : undefined;

  return (
    <div
      className="relative bg-panel rounded-xl px-3 py-2 shadow-sm w-[170px] text-center border border-line/60 border-r-[3px]"
      style={{ borderRightColor: color }}
    >
      <div className="text-xs font-semibold text-ink truncate">{member.fullName}</div>
      {member.title && <div className="text-[11px] text-ink-soft truncate">{member.title}</div>}
      {(level || classification) && (
        <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
          {level && <span className="text-[10px] text-accent bg-accent-bg rounded-full px-1.5 py-0.5">{level.name}</span>}
          {classification && (
            <span className="text-[10px] text-warn bg-warn-bg rounded-full px-1.5 py-0.5">{classification.name}</span>
          )}
        </div>
      )}
    </div>
  );
}

function MemberBranchNode({
  member,
  childrenOf,
  color,
  levelById,
  classificationById,
}: {
  member: ChartMember;
  childrenOf: Map<string, ChartMember[]>;
  color: string;
  levelById: Map<string, OrganizationalLevel>;
  classificationById: Map<string, OrganizationalClassification>;
}) {
  const children = childrenOf.get(member.id) ?? [];
  return (
    <li>
      <MemberLeafCard member={member} color={color} levelById={levelById} classificationById={classificationById} />
      {children.length > 0 && (
        <ul>
          {children.map((c) => (
            <MemberBranchNode
              key={c.id}
              member={c}
              childrenOf={childrenOf}
              color={color}
              levelById={levelById}
              classificationById={classificationById}
            />
          ))}
        </ul>
      )}
    </li>
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
  collapsedIds,
  onToggleCollapse,
}: {
  dept: Department;
  departments: Department[];
  members: ChartMember[];
  canEdit: boolean;
  onEdit: (dept: Department) => void;
  colorMap: Map<string, string>;
  depth: number;
  levelById: Map<string, OrganizationalLevel>;
  classificationById: Map<string, OrganizationalClassification>;
  collapsedIds: Set<string>;
  onToggleCollapse: (id: string) => void;
}) {
  const children = departments.filter((d) => d.parentDepartmentId === dept.id);
  const { roots: memberRoots, childrenOf } = buildMemberTree(
    members.filter((m) => m.departmentId === dept.id && m.role !== "head"),
    levelById
  );
  const color = colorMap.get(dept.id) ?? "#5B6472";
  const hasBranches = children.length > 0 || memberRoots.length > 0;
  const collapsed = collapsedIds.has(dept.id);

  return (
    <li>
      <DeptCard
        dept={dept}
        members={members}
        canEdit={canEdit}
        onEdit={onEdit}
        color={color}
        isRoot={depth === 0}
        levelById={levelById}
        classificationById={classificationById}
        collapsible={hasBranches}
        collapsed={collapsed}
        onToggleCollapse={() => onToggleCollapse(dept.id)}
      />
      {hasBranches && !collapsed && (
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
              collapsedIds={collapsedIds}
              onToggleCollapse={onToggleCollapse}
            />
          ))}
          {memberRoots.map((m) => (
            <MemberBranchNode
              key={m.id}
              member={m}
              childrenOf={childrenOf}
              color={color}
              levelById={levelById}
              classificationById={classificationById}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** عرض بديل بشكل قائمة متداخلة عمودية بلا تمرير أفقي — للجوال والشاشات الضيقة، حيث
 * شجرة البطاقات الأفقية تصبح غير عملية. */
function MobileMemberRow({
  member,
  childrenOf,
  depth,
  levelById,
  classificationById,
}: {
  member: ChartMember;
  childrenOf: Map<string, ChartMember[]>;
  depth: number;
  levelById: Map<string, OrganizationalLevel>;
  classificationById: Map<string, OrganizationalClassification>;
}) {
  const level = member.organizationalLevelId ? levelById.get(member.organizationalLevelId) : undefined;
  const classification = member.organizationalClassificationId
    ? classificationById.get(member.organizationalClassificationId)
    : undefined;
  const children = childrenOf.get(member.id) ?? [];

  return (
    <>
      <div style={{ marginRight: depth * 14 }} className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-ink">{member.fullName}</span>
        {member.title && <span className="text-[11px] text-ink-soft">— {member.title}</span>}
        {level && <span className="text-[10px] text-accent bg-accent-bg rounded-full px-1.5 py-0.5">{level.name}</span>}
        {classification && (
          <span className="text-[10px] text-warn bg-warn-bg rounded-full px-1.5 py-0.5">{classification.name}</span>
        )}
      </div>
      {children.map((c) => (
        <MobileMemberRow
          key={c.id}
          member={c}
          childrenOf={childrenOf}
          depth={depth + 1}
          levelById={levelById}
          classificationById={classificationById}
        />
      ))}
    </>
  );
}

function MobileOrgRow({
  dept,
  departments,
  members,
  colorMap,
  depth,
  levelById,
  classificationById,
}: {
  dept: Department;
  departments: Department[];
  members: ChartMember[];
  colorMap: Map<string, string>;
  depth: number;
  levelById: Map<string, OrganizationalLevel>;
  classificationById: Map<string, OrganizationalClassification>;
}) {
  const children = departments.filter((d) => d.parentDepartmentId === dept.id);
  const deptMembers = members.filter((m) => m.departmentId === dept.id);
  const head = deptMembers.find((m) => m.role === "head");
  const { roots: memberRoots, childrenOf } = buildMemberTree(
    deptMembers.filter((m) => m.role !== "head"),
    levelById
  );
  const color = colorMap.get(dept.id) ?? "#5B6472";
  const [open, setOpen] = useState(true);
  const hasContent = children.length > 0 || memberRoots.length > 0;

  return (
    <div style={{ marginRight: depth * 14 }} className="mt-2">
      <div
        className="bg-panel border border-line/60 rounded-lg px-3 py-2 border-r-[3px] flex items-center justify-between gap-2 cursor-pointer"
        style={{ borderRightColor: color }}
        onClick={() => hasContent && setOpen((v) => !v)}
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink truncate">{dept.name}</div>
          <div className="text-xs text-ink-soft truncate">
            {head ? `${roleLabel(dept, "head")}: ${head.fullName}` : `بدون ${roleLabel(dept, "head")}`}
          </div>
        </div>
        {hasContent && (
          <span className="text-ink-soft shrink-0">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
        )}
      </div>

      {open && (
        <>
          {memberRoots.map((m) => (
            <MobileMemberRow
              key={m.id}
              member={m}
              childrenOf={childrenOf}
              depth={depth + 1}
              levelById={levelById}
              classificationById={classificationById}
            />
          ))}
          {children.map((c) => (
            <MobileOrgRow
              key={c.id}
              dept={c}
              departments={departments}
              members={members}
              colorMap={colorMap}
              depth={depth + 1}
              levelById={levelById}
              classificationById={classificationById}
            />
          ))}
        </>
      )}
    </div>
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
  members: ChartMember[];
  canEdit: boolean;
  onEdit: (dept: Department) => void;
  levels?: OrganizationalLevel[];
  classifications?: OrganizationalClassification[];
}) {
  const colorMap = computeBranchColors(roots, departments);
  const levelById = new Map(levels.map((l) => [l.id, l]));
  const classificationById = new Map(classifications.map((c) => [c.id, c]));
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  /** null = وضع "احتواء تلقائي" (الافتراضي) — رقم = تكبير/تصغير حدَّده المستخدم يدوياً
   * ويبقى ثابتاً حتى يعيد الضبط، بغض النظر عن حجم الشجرة الطبيعي. */
  const [manualZoom, setManualZoom] = useState<number | null>(null);
  const [autoFitZoom, setAutoFitZoom] = useState(1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  const zoom = manualZoom ?? autoFitZoom;

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const tree = treeRef.current;
    if (!wrapper || !tree) return;

    const update = () => {
      // scrollWidth/scrollHeight يعكسان الحجم الطبيعي دائماً بغض النظر عن transform
      // المطبَّق على نفس العنصر (لا يؤثر التحجيم البصري على قياس الصندوق نفسه).
      const naturalWidth = tree.scrollWidth;
      const naturalHeight = tree.scrollHeight;
      if (naturalWidth === 0 || naturalHeight === 0) return;
      const availableWidth = wrapper.clientWidth - 32;
      const availableHeight = wrapper.clientHeight - 32;
      const fit = Math.min(1, availableWidth / naturalWidth, availableHeight / naturalHeight);
      setAutoFitZoom(Math.max(0.15, fit));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [roots, departments, members, collapsedIds]);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      {/* عرض الجوال/الشاشات الضيقة — قائمة عمودية متداخلة بلا تمرير أفقي */}
      <div className="sm:hidden">
        <div className="bg-navy rounded-xl px-4 py-2.5 text-white text-sm font-bold shadow-sm text-center">{companyName}</div>
        {roots.map((r) => (
          <MobileOrgRow
            key={r.id}
            dept={r}
            departments={departments}
            members={members}
            colorMap={colorMap}
            depth={0}
            levelById={levelById}
            classificationById={classificationById}
          />
        ))}
      </div>

      {/* عرض الشاشات الأوسع — شجرة بطاقات أفقية مع تكبير/تصغير وطي */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-end gap-1.5 mb-2 print:hidden">
          <button
            type="button"
            onClick={() => setManualZoom(Math.max(ZOOM_MIN, +(zoom - ZOOM_STEP).toFixed(2)))}
            title="تصغير"
            className="w-7 h-7 rounded-lg bg-panel border border-line/70 text-ink-soft flex items-center justify-center cursor-pointer hover:text-ink"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-xs text-ink-soft w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setManualZoom(Math.min(ZOOM_MAX, +(zoom + ZOOM_STEP).toFixed(2)))}
            title="تكبير"
            className="w-7 h-7 rounded-lg bg-panel border border-line/70 text-ink-soft flex items-center justify-center cursor-pointer hover:text-ink"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={() => setManualZoom(null)}
            title="احتواء تلقائي"
            className="w-7 h-7 rounded-lg bg-panel border border-line/70 text-ink-soft flex items-center justify-center cursor-pointer hover:text-ink"
          >
            <Maximize2 size={13} />
          </button>
        </div>
        <div ref={wrapperRef} className="w-full h-[80vh] overflow-auto border border-line/60 rounded-xl bg-bg print-reset-bounds">
          <div className="flex justify-center">
            <div
              ref={treeRef}
              dir="ltr"
              className="print-reset-transform"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top center", padding: 16 }}
            >
              <ul className="org-tree">
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
                          collapsedIds={collapsedIds}
                          onToggleCollapse={toggleCollapse}
                        />
                      ))}
                    </ul>
                  )}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
