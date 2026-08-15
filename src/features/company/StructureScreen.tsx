import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SecondaryButton } from "@/components/ui";
import { useCompany } from "@/features/company/useCompany";
import { useDepartments } from "@/features/company/api/useDepartments";
import { useDepartmentMembers } from "@/features/company/api/useDepartmentMembers";
import { useUpdateDepartment } from "@/features/company/api/useUpdateDepartment";
import { useCompanyProjectAccess, type ProjectAccess } from "@/features/company/api/useCompanyProjectAccess";
import type { Department, MemberRole } from "@/types/domain";

const PROJECT_COLOR_PALETTE = [
  "#2E6FE8",
  "#DFA22E",
  "#2E9E52",
  "#D14343",
  "#8B5CF6",
  "#0EA5A6",
  "#EC4899",
  "#64748B",
  "#B45309",
  "#059669",
];

function assignProjectColors(projectAccess: ProjectAccess[]): Map<string, string> {
  const map = new Map<string, string>();
  projectAccess.forEach((p, i) => map.set(p.projectId, PROJECT_COLOR_PALETTE[i % PROJECT_COLOR_PALETTE.length]));
  return map;
}

interface UserProjectDot {
  projectId: string;
  projectName: string;
  color: string;
}

function buildUserProjectDots(projectAccess: ProjectAccess[], colorByProject: Map<string, string>): Map<string, UserProjectDot[]> {
  const map = new Map<string, UserProjectDot[]>();
  for (const p of projectAccess) {
    const color = colorByProject.get(p.projectId)!;
    for (const m of p.members) {
      const list = map.get(m.userId) ?? [];
      list.push({ projectId: p.projectId, projectName: p.projectName, color });
      map.set(m.userId, list);
    }
  }
  return map;
}

function ProjectDots({ dots, selectedProjectId }: { dots: UserProjectDot[] | undefined; selectedProjectId: string | null }) {
  if (!dots || dots.length === 0) return null;
  return (
    <span className="inline-flex items-center justify-center gap-1 shrink-0">
      {dots.map((d) => {
        const isSelected = d.projectId === selectedProjectId;
        const dimmed = selectedProjectId !== null && !isSelected;
        return (
          <span
            key={d.projectId}
            title={d.projectName}
            className="rounded-full inline-block transition-all"
            style={{
              background: d.color,
              width: isSelected ? 10 : 8,
              height: isSelected ? 10 : 8,
              opacity: dimmed ? 0.25 : 1,
              boxShadow: isSelected ? "0 0 0 2px white" : undefined,
            }}
          />
        );
      })}
    </span>
  );
}

const NODE_COLOR = "#1c5d72";
const NODE_WIDTH = 190;
const NODE_HEIGHT = 96;
const CANVAS_WIDTH = 2200;
const CANVAS_HEIGHT = 1300;

const ROLE_LABEL: Record<string, string> = { member: "عضو", head: "رئيس القسم" };
const PROJECT_ROLE_LABEL: Record<string, string> = { manager: "صلاحية كاملة (مدير مشروع)", member: "صلاحية عضو" };

function roleLabel(dept: { headLabel: string | null; memberLabel: string | null } | undefined, role: MemberRole): string {
  if (!dept) return ROLE_LABEL[role];
  if (role === "head") return dept.headLabel || ROLE_LABEL.head;
  return dept.memberLabel || ROLE_LABEL.member;
}

interface Pos {
  x: number;
  y: number;
}

function computeDefaultPositions(roots: Department[], departments: Department[]): Map<string, Pos> {
  const positions = new Map<string, Pos>();
  let column = 0;

  function place(dept: Department, depth: number) {
    const children = departments.filter((d) => d.parentDepartmentId === dept.id);
    if (children.length === 0) {
      positions.set(dept.id, { x: 80 + column * (NODE_WIDTH + 40), y: 140 + depth * (NODE_HEIGHT + 70) });
      column++;
      return;
    }
    const startColumn = column;
    children.forEach((c) => place(c, depth + 1));
    const endColumn = column - 1;
    const centerColumn = (startColumn + endColumn) / 2;
    positions.set(dept.id, { x: 80 + centerColumn * (NODE_WIDTH + 40), y: 140 + depth * (NODE_HEIGHT + 70) });
  }

  roots.forEach((r) => place(r, 0));
  return positions;
}

export function StructureScreen() {
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { company, profile } = useCompany();
  const departmentsQuery = useDepartments(company.id);
  const allDepartments = departmentsQuery.data ?? [];
  const membersQuery = useDepartmentMembers(allDepartments.map((d) => d.id));
  const members = membersQuery.data ?? [];
  const accessQuery = useCompanyProjectAccess(company.id);
  const projectAccess = accessQuery.data ?? [];
  const updateDepartment = useUpdateDepartment();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [livePositions, setLivePositions] = useState<Record<string, Pos>>({});

  const isOwner = company.createdBy === profile.id;
  const isExecutive = members.some(
    (m) => m.userId === profile.id && allDepartments.find((d) => d.id === m.departmentId)?.type === "executive"
  );
  const headDepartmentIds = new Set(
    members.filter((m) => m.userId === profile.id && m.role === "head").map((m) => m.departmentId)
  );

  const canSeeAll = isOwner || isExecutive;

  function collectSubtree(rootId: string, acc: Set<string>) {
    acc.add(rootId);
    for (const d of allDepartments) {
      if (d.parentDepartmentId === rootId && !acc.has(d.id)) collectSubtree(d.id, acc);
    }
  }

  let visibleIds = new Set<string>();
  if (canSeeAll) {
    visibleIds = new Set(allDepartments.map((d) => d.id));
  } else {
    for (const id of headDepartmentIds) collectSubtree(id, visibleIds);
  }
  const departments = allDepartments.filter((d) => visibleIds.has(d.id));
  const roots = canSeeAll
    ? departments.filter((d) => !d.parentDepartmentId || !visibleIds.has(d.parentDepartmentId))
    : departments.filter((d) => headDepartmentIds.has(d.id));

  const canDrag = (deptId: string) => canSeeAll || headDepartmentIds.has(deptId) || visibleIds.has(deptId);

  const scopedProjectAccess = projectAccess
    .map((p) => ({ ...p, members: p.members.filter((m) => visibleIds.size > 0 && members.some((dm) => dm.userId === m.userId && visibleIds.has(dm.departmentId))) }))
    .filter((p) => p.members.length > 0);

  const colorByProject = assignProjectColors(scopedProjectAccess);
  const projectDots = buildUserProjectDots(scopedProjectAccess, colorByProject);

  const defaultPositions = computeDefaultPositions(roots, departments);

  const getPos = (deptId: string): Pos => {
    if (livePositions[deptId]) return livePositions[deptId];
    const dept = departments.find((d) => d.id === deptId);
    if (dept?.positionX != null && dept?.positionY != null) return { x: dept.positionX, y: dept.positionY };
    return defaultPositions.get(deptId) ?? { x: 80, y: 140 };
  };

  const companyPos: Pos = { x: CANVAS_WIDTH / 2 - NODE_WIDTH / 2, y: 20 };

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.offsetWidth / rect.width;
      const scaleY = canvas.offsetHeight / rect.height;
      let x = (e.clientX - rect.left) * scaleX - dragState.offsetX;
      let y = (e.clientY - rect.top) * scaleY - dragState.offsetY;
      x = Math.max(0, Math.min(x, CANVAS_WIDTH - NODE_WIDTH));
      y = Math.max(0, Math.min(y, CANVAS_HEIGHT - NODE_HEIGHT));
      setLivePositions((prev) => ({ ...prev, [dragState.id]: { x, y } }));
    };

    const handleUp = () => {
      const finalPos = livePositions[dragState.id];
      if (finalPos) {
        updateDepartment.mutate({ id: dragState.id, companyId: company.id, positionX: finalPos.x, positionY: finalPos.y });
      }
      setDragState(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragState, livePositions]);

  const startDrag = (deptId: string, e: React.PointerEvent) => {
    if (!canDrag(deptId)) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.offsetWidth / rect.width;
    const scaleY = canvas.offsetHeight / rect.height;
    const pos = getPos(deptId);
    const pointerX = (e.clientX - rect.left) * scaleX;
    const pointerY = (e.clientY - rect.top) * scaleY;
    setDragState({ id: deptId, offsetX: pointerX - pos.x, offsetY: pointerY - pos.y });
    setLivePositions((prev) => ({ ...prev, [deptId]: pos }));
  };

  const isLoading = departmentsQuery.isLoading || membersQuery.isLoading || accessQuery.isLoading;

  const lines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  for (const dept of roots) {
    const p = getPos(dept.id);
    lines.push({
      key: `company-${dept.id}`,
      x1: companyPos.x + NODE_WIDTH / 2,
      y1: companyPos.y + 44,
      x2: p.x + NODE_WIDTH / 2,
      y2: p.y,
    });
  }
  for (const dept of departments) {
    if (!dept.parentDepartmentId || !visibleIds.has(dept.parentDepartmentId)) continue;
    const parentPos = getPos(dept.parentDepartmentId);
    const childPos = getPos(dept.id);
    lines.push({
      key: `${dept.parentDepartmentId}-${dept.id}`,
      x1: parentPos.x + NODE_WIDTH / 2,
      y1: parentPos.y + NODE_HEIGHT,
      x2: childPos.x + NODE_WIDTH / 2,
      y2: childPos.y,
    });
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-2 gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-ink">{canSeeAll ? "هيكلة الشركة" : "هيكلة القسم"}</h1>
        <SecondaryButton onClick={() => navigate("/")} className="text-sm">
          رجوع
        </SecondaryButton>
      </div>
      <p className="text-xs text-ink-soft mb-6">
        محرر رسم حر — اسحب أي صندوق لأي مكان تريده، ويُحفظ موقعه تلقائياً. الخطوط تعكس التبعية الفعلية (من القسم
        الأعلى)، والموقع على اللوحة اختيارك الكامل.
      </p>

      {isLoading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}

      {!isLoading && roots.length === 0 && (
        <div className="bg-panel border border-dashed border-line rounded-xl p-10 text-center text-sm text-ink-soft">
          {canSeeAll ? "لا توجد أقسام بعد" : "هذه الشاشة مخصصة للإدارة التنفيذية ورؤساء الأقسام"}
        </div>
      )}

      {!isLoading && roots.length > 0 && (
        <>
          <div className="bg-panel border border-line/60 shadow-sm rounded-xl mb-8 overflow-auto" style={{ maxHeight: "70vh" }}>
            <div
              ref={canvasRef}
              dir="ltr"
              className="relative"
              style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, touchAction: "none" }}
            >
              <svg
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="absolute inset-0 pointer-events-none"
                style={{ zIndex: 0 }}
              >
                {lines.map((l) => (
                  <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#c7cdd6" strokeWidth={2} />
                ))}
              </svg>

              <div
                className="absolute rounded-xl px-5 py-3 text-white text-sm font-bold shadow-sm bg-ink"
                style={{ left: companyPos.x, top: companyPos.y, width: NODE_WIDTH, textAlign: "center", zIndex: 1 }}
              >
                <span dir="rtl">{company.name}</span>
              </div>

              {departments.map((dept) => {
                const pos = getPos(dept.id);
                const deptMembers = members.filter((m) => m.departmentId === dept.id);
                const head = deptMembers.find((m) => m.role === "head");
                const rest = deptMembers.filter((m) => m.role !== "head");
                const allDots = [
                  ...(projectDots.get(head?.userId ?? "") ?? []),
                  ...rest.flatMap((m) => projectDots.get(m.userId) ?? []),
                ];
                const uniqueDots = [...new Map(allDots.map((d) => [d.projectId, d])).values()];
                const isMatched = selectedProjectId !== null && uniqueDots.some((d) => d.projectId === selectedProjectId);
                const draggable = canDrag(dept.id);

                return (
                  <div
                    key={dept.id}
                    onPointerDown={(e) => startDrag(dept.id, e)}
                    className="absolute rounded-lg px-4 py-3 text-white shadow-sm transition-shadow select-none"
                    style={{
                      left: pos.x,
                      top: pos.y,
                      width: NODE_WIDTH,
                      background: NODE_COLOR,
                      opacity: selectedProjectId !== null && !isMatched ? 0.4 : 1,
                      boxShadow: isMatched ? `0 0 0 3px ${uniqueDots.find((d) => d.projectId === selectedProjectId)?.color}` : undefined,
                      cursor: draggable ? (dragState?.id === dept.id ? "grabbing" : "grab") : "default",
                      zIndex: dragState?.id === dept.id ? 2 : 1,
                    }}
                  >
                    <div dir="rtl" className="text-center">
                      <div className="text-sm font-bold truncate">{dept.name}</div>
                      {head ? (
                        <div className="text-xs opacity-90 mt-1 truncate">
                          {roleLabel(dept, "head")}: {head.fullName}
                        </div>
                      ) : (
                        <div className="text-xs opacity-70 mt-1">بدون {roleLabel(dept, "head")}</div>
                      )}
                      {rest.length > 0 && <div className="text-[11px] opacity-75 mt-0.5">+{rest.length} أعضاء آخرين</div>}
                      {uniqueDots.length > 0 && (
                        <div className="mt-1.5">
                          <ProjectDots dots={uniqueDots} selectedProjectId={selectedProjectId} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-ink mb-1">صلاحيات الوصول للمشاريع</h2>
            <p className="text-xs text-ink-soft mb-3">
              لكل مشروع لون مميز — نفس اللون يظهر كنقطة بجانب اسم أي عضو له وصول عليه في اللوحة أعلاه. اضغط على أي
              مشروع أدناه لتظليل كل الأقسام والأعضاء المشتركين فيه مباشرة.
            </p>
            {scopedProjectAccess.length === 0 ? (
              <p className="text-xs text-ink-soft">لا توجد مشاريع مرتبطة بأعضاء ضمن هذا النطاق بعد</p>
            ) : (
              <div className="flex flex-col gap-3">
                {scopedProjectAccess.map((p) => {
                  const isSelected = selectedProjectId === p.projectId;
                  return (
                    <div
                      key={p.projectId}
                      className="bg-panel border border-line/60 shadow-sm rounded-xl p-5 cursor-pointer transition-all"
                      style={isSelected ? { boxShadow: `0 0 0 2px ${colorByProject.get(p.projectId)}` } : undefined}
                      onClick={() => setSelectedProjectId(isSelected ? null : p.projectId)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorByProject.get(p.projectId) }} />
                        <h3 className="text-sm font-bold text-ink">{p.projectName}</h3>
                        {isSelected && <span className="text-[10px] text-ink-soft mr-auto">مُظلَّل باللوحة ▲</span>}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {p.members.map((m) => (
                          <div key={m.userId} className="flex items-center justify-between text-xs bg-bg rounded-lg px-3 py-2">
                            <span className="text-ink">{m.fullName}</span>
                            <span className="text-ink-soft">{PROJECT_ROLE_LABEL[m.role]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
