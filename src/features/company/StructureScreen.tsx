import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, FileText, FileSpreadsheet } from "lucide-react";
import { SecondaryButton, PrimaryButton, IconButton, FieldLabel, TextInput, ErrorText, Modal, ExportMenu } from "@/components/ui";
import { exportToExcel } from "@/utils/exportExcel";
import { useCompany } from "@/features/company/useCompany";
import { useDepartments } from "@/features/company/api/useDepartments";
import { useDepartmentMembers } from "@/features/company/api/useDepartmentMembers";
import { useUpdateDepartment } from "@/features/company/api/useUpdateDepartment";
import { useCreateDepartment } from "@/features/company/api/useCreateDepartment";
import { useDeleteDepartment } from "@/features/company/api/useDeleteDepartment";
import { useCompanyProjectAccess, type ProjectAccess } from "@/features/company/api/useCompanyProjectAccess";
import { DEPARTMENT_TYPE_LABEL } from "@/features/company/departmentTypeLabels";
import { branchLegend } from "@/features/company/lib/branchColors";
import { getSubtreeDepartmentIds } from "@/features/company/lib/departmentTree";
import { DepartmentActivityView } from "@/features/company/DepartmentsScreen";
import { OrgTreeChart, type ChartMember } from "@/features/company/OrgTreeChart";
import { OrgTaxonomyScreen } from "@/features/company/OrgTaxonomyScreen";
import { EmployeesScreen } from "@/features/company/EmployeesScreen";
import { EmployeeFormModal } from "@/features/company/EmployeeFormModal";
import { useOrganizationalLevels } from "@/features/company/api/useOrganizationalLevels";
import { useOrganizationalClassifications } from "@/features/company/api/useOrganizationalClassifications";
import { useJobTitles } from "@/features/company/api/useJobTitles";
import { useEmployees } from "@/features/company/api/useEmployees";
import type { Department, DepartmentType, MemberRole } from "@/types/domain";

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

const ROLE_LABEL: Record<string, string> = { member: "عضو", head: "رئيس القسم" };
const PROJECT_ROLE_LABEL: Record<string, string> = { manager: "صلاحية كاملة (مدير مشروع)", member: "صلاحية عضو" };

function roleLabel(dept: { headLabel: string | null; memberLabel: string | null } | undefined, role: MemberRole): string {
  if (!dept) return ROLE_LABEL[role];
  if (role === "head") return dept.headLabel || ROLE_LABEL.head;
  return dept.memberLabel || ROLE_LABEL.member;
}

type Tab = "chart" | "activity" | "taxonomy" | "employees";

export function StructureScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("chart");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { company, profile } = useCompany();
  const departmentsQuery = useDepartments(company.id);
  const allDepartments = departmentsQuery.data ?? [];
  const membersQuery = useDepartmentMembers(allDepartments.map((d) => d.id));
  const members = membersQuery.data ?? [];
  const accessQuery = useCompanyProjectAccess(company.id);
  const projectAccess = accessQuery.data ?? [];
  const levelsQuery = useOrganizationalLevels(company.id);
  const levels = levelsQuery.data ?? [];
  const classificationsQuery = useOrganizationalClassifications(company.id);
  const classifications = classificationsQuery.data ?? [];
  const jobTitlesQuery = useJobTitles(company.id);
  const jobTitles = jobTitlesQuery.data ?? [];
  const employeesQuery = useEmployees(company.id);
  const employeesList = employeesQuery.data ?? [];
  const [addingEmployee, setAddingEmployee] = useState(false);

  const employeeById = new Map(employeesList.map((e) => [e.id, e]));

  /** موظفون قبل الدعوة (بلا حساب مستخدم فعلي) لا يملكون صف department_members حتى
   * الآن — نضيفهم كعناصر صورية لعرضهم على الشجرة ضمن قسمهم مباشرة، بدل أن يبقوا غير
   * ظاهرين إلا بتبويب "الموظفون" المنفصل. كما نقرأ المستوى/التصنيف/المسمّى/المدير
   * المباشر من سجل employees المرتبط (وليس من أعمدة department_members نفسها) —
   * employees هو المكان الوحيد القابل للتعديل لهذه الحقول الآن (من "الموظفون" لمدير
   * الحساب، أو من هذه القائمة لرئيس القسم)، فيبقى الأعمدة المطابقة على department_members
   * قديمة/غير مُحدَّثة بعد اليوم ويجب تجاهلها كمصدر عرض. */
  const chartMembers: ChartMember[] = [
    ...members.map((m) => {
      const linkedEmployee = m.employeeId ? employeeById.get(m.employeeId) : undefined;
      return {
        ...m,
        organizationalLevelId: linkedEmployee?.organizationalLevelId ?? null,
        organizationalClassificationId: linkedEmployee?.organizationalClassificationId ?? null,
        jobTitleId: linkedEmployee?.jobTitleId ?? null,
        directManagerEmployeeId: linkedEmployee?.directManagerEmployeeId ?? null,
      };
    }),
    ...employeesList
      .filter((e) => !e.userId && e.departmentId)
      .map((e) => ({
        id: `employee-${e.id}`,
        departmentId: e.departmentId!,
        userId: `employee-${e.id}`,
        role: "member" as MemberRole,
        fullName: e.fullName,
        title: null,
        organizationalLevelId: e.organizationalLevelId,
        organizationalClassificationId: e.organizationalClassificationId,
        jobTitleId: e.jobTitleId,
        employeeId: e.id,
        directManagerEmployeeId: e.directManagerEmployeeId,
      })),
  ];
  const updateDepartment = useUpdateDepartment();
  const createDepartment = useCreateDepartment();
  const deleteDepartment = useDeleteDepartment(company.id);

  const [creating, setCreating] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptType, setNewDeptType] = useState<DepartmentType>("custom");
  const [newDeptParentId, setNewDeptParentId] = useState("");
  const [createError, setCreateError] = useState("");

  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [editError, setEditError] = useState("");
  const [confirmDeleteDept, setConfirmDeleteDept] = useState<Department | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const isOwner = company.createdBy === profile.id;
  const isExecutive = members.some(
    (m) => m.userId === profile.id && allDepartments.find((d) => d.id === m.departmentId)?.type === "executive"
  );
  const headDepartmentIds = new Set(
    members.filter((m) => m.userId === profile.id && m.role === "head").map((m) => m.departmentId)
  );

  const canSeeAll = isOwner || isExecutive;
  const canEdit = isOwner;

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

  const scopedProjectAccess = projectAccess
    .map((p) => ({ ...p, members: p.members.filter((m) => visibleIds.size > 0 && members.some((dm) => dm.userId === m.userId && visibleIds.has(dm.departmentId))) }))
    .filter((p) => p.members.length > 0);

  const colorByProject = assignProjectColors(scopedProjectAccess);

  const openCreate = () => {
    setNewDeptName("");
    setNewDeptType("custom");
    setNewDeptParentId("");
    setCreateError("");
    setCreating(true);
  };

  const handleCreate = async () => {
    if (!newDeptName.trim()) return;
    setCreateError("");
    try {
      await createDepartment.mutateAsync({
        companyId: company.id,
        name: newDeptName.trim(),
        type: newDeptType,
        parentDepartmentId: newDeptParentId || null,
      });
      setCreating(false);
    } catch {
      setCreateError("تعذّر إنشاء القسم، حاول مجدداً");
    }
  };

  const openEdit = (dept: Department) => {
    setEditingDept(dept);
    setEditName(dept.name);
    setEditParentId(dept.parentDepartmentId ?? "");
    setEditError("");
  };

  const handleSaveEdit = async () => {
    if (!editingDept || !editName.trim()) return;
    setEditError("");
    try {
      await updateDepartment.mutateAsync({
        id: editingDept.id,
        companyId: company.id,
        name: editName.trim(),
        parentDepartmentId: editParentId || null,
      });
      setEditingDept(null);
    } catch {
      setEditError("تعذّر حفظ التعديل، حاول مجدداً");
    }
  };

  const handleDeleteDept = async () => {
    if (!confirmDeleteDept) return;
    setDeleteError("");
    try {
      await deleteDepartment.mutateAsync(confirmDeleteDept.id);
      setConfirmDeleteDept(null);
      setEditingDept(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "تعذّر حذف القسم، حاول مجدداً");
    }
  };

  const isLoading = departmentsQuery.isLoading || membersQuery.isLoading || accessQuery.isLoading;

  /** بدل توليد مستند PDF منفصل مُصمَّم بشكل مختلف عمّا يظهر فعلياً على الشاشة، نطبع
   * المحتوى المعروض حالياً كما هو (أي تبويب مفتوح: الهيكلة، نشاط الأعضاء، المستويات
   * والتصنيفات، أو الموظفون) عبر .print-area في index.css. */
  const handleExportOrgChart = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    const jobTitleById = new Map(jobTitles.map((j) => [j.id, j]));
    const levelById = new Map(levels.map((l) => [l.id, l]));
    const classificationById = new Map(classifications.map((c) => [c.id, c]));
    const rows = departments.flatMap((d) =>
      chartMembers
        .filter((m) => m.departmentId === d.id)
        .map((m) => ({
          القسم: d.name,
          الاسم: m.fullName,
          الدور: roleLabel(d, m.role),
          "المسمى الوظيفي": m.title || (m.jobTitleId ? jobTitleById.get(m.jobTitleId)?.name ?? "" : ""),
          "المستوى الإداري": m.organizationalLevelId ? levelById.get(m.organizationalLevelId)?.name ?? "" : "",
          التصنيف: m.organizationalClassificationId ? classificationById.get(m.organizationalClassificationId)?.name ?? "" : "",
        }))
    );
    await exportToExcel(`الهيكل التنظيمي - ${company.name}`, [{ name: "الهيكل التنظيمي", rows }]);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-ink">الأقسام والهيكلة</h1>
        <div className="flex items-center gap-2 shrink-0">
          {tab === "chart" && roots.length > 0 && (
            <ExportMenu
              options={[
                { label: "تصدير PDF", icon: FileText, onSelect: handleExportOrgChart },
                { label: "تصدير Excel", icon: FileSpreadsheet, onSelect: handleExportExcel },
              ]}
            />
          )}
          {tab === "chart" && canEdit && (
            <SecondaryButton onClick={openCreate} className="text-sm inline-flex items-center gap-1.5">
              <Plus size={15} strokeWidth={2.5} /> إضافة قسم
            </SecondaryButton>
          )}
          {tab === "chart" && canSeeAll && (
            <SecondaryButton onClick={() => setAddingEmployee(true)} className="text-sm inline-flex items-center gap-1.5">
              <Plus size={15} strokeWidth={2.5} /> إضافة موظف
            </SecondaryButton>
          )}
          <SecondaryButton onClick={() => navigate("/")} className="text-sm">
            رجوع
          </SecondaryButton>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(
          [
            { key: "chart", label: "الهيكلة" },
            { key: "activity", label: "نشاط الأعضاء" },
            ...(canSeeAll ? [{ key: "taxonomy", label: "المستويات والتصنيفات" }] : []),
            ...(canSeeAll ? [{ key: "employees", label: "الموظفون" }] : []),
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-sm font-semibold px-3 py-1.5 rounded-lg cursor-pointer border ${
              tab === t.key ? "border-primary bg-primary-bg text-ink" : "border-line/60 bg-panel text-ink-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="print-area">
      {tab === "activity" ? (
        <DepartmentActivityView />
      ) : tab === "taxonomy" ? (
        <OrgTaxonomyScreen companyId={company.id} canEdit={canSeeAll} />
      ) : tab === "employees" ? (
        <EmployeesScreen companyId={company.id} canEdit={canSeeAll} />
      ) : (
        <>
          <p className="text-xs text-ink-soft mb-6">
            {canEdit
              ? 'شجرة تلقائية التوزيع — أضف أقساماً جديدة، واضغط أيقونة التعديل على أي قسم لتغيير اسمه أو القسم الأب التابع له. الإطار المتقطع يعني أن القسم بلا رئيس معيّن بعد.'
              : "عرض فقط — إضافة الأقسام وربط علاقاتها متاح لمدير الحساب فقط."}
          </p>

          {isLoading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}

          {!isLoading && roots.length === 0 && (
            <div className="bg-panel border border-dashed border-line rounded-xl p-10 text-center text-sm text-ink-soft">
              {canEdit ? 'لا توجد أقسام بعد — اضغط "إضافة قسم" أعلاه لإنشاء أول قسم' : canSeeAll ? "لا توجد أقسام بعد" : "هذه الشاشة مخصصة للإدارة التنفيذية ورؤساء الأقسام"}
            </div>
          )}

          {!isLoading && roots.length > 0 && (
            <>
              <div className="bg-panel border border-line/60 shadow-sm rounded-xl mb-2 p-6">
                <OrgTreeChart
                  companyName={company.name}
                  roots={roots}
                  departments={departments}
                  members={chartMembers}
                  canEdit={canEdit}
                  onEdit={openEdit}
                  levels={levels}
                  classifications={classifications}
                />
              </div>

              <div className="flex items-center gap-4 flex-wrap text-xs text-ink-soft mb-8 px-1">
                {branchLegend(roots).map((b) => (
                  <div key={b.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: b.color }} />
                    {b.name}
                  </div>
                ))}
              </div>

              <div>
                <h2 className="text-sm font-bold text-ink mb-1">صلاحيات الوصول للمشاريع</h2>
                <p className="text-xs text-ink-soft mb-3">
                  لكل مشروع لون مميز — اضغط على أي مشروع أدناه لعرض الأعضاء المشتركين فيه.
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
                            {isSelected && <span className="text-[10px] text-ink-soft mr-auto">▲</span>}
                          </div>
                          {isSelected && (
                            <div className="flex flex-col gap-1.5">
                              {p.members.map((m) => (
                                <div key={m.userId} className="flex items-center justify-between text-xs bg-bg rounded-lg px-3 py-2">
                                  <span className="text-ink">{m.fullName}</span>
                                  <span className="text-ink-soft">{PROJECT_ROLE_LABEL[m.role]}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
      </div>

      {creating && (
        <Modal title="قسم جديد" onClose={() => setCreating(false)}>
          <FieldLabel>اسم القسم</FieldLabel>
          <TextInput value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} autoFocus />
          <div className="mb-3" />
          <FieldLabel>نوع القسم</FieldLabel>
          <select
            value={newDeptType}
            onChange={(e) => setNewDeptType(e.target.value as DepartmentType)}
            className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink"
          >
            {Object.entries(DEPARTMENT_TYPE_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <div className="mb-3" />
          <FieldLabel>القسم الأب (اختياري)</FieldLabel>
          <select
            value={newDeptParentId}
            onChange={(e) => setNewDeptParentId(e.target.value)}
            className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink"
          >
            <option value="">بدون — قسم رئيسي تابع للشركة مباشرة</option>
            {allDepartments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <ErrorText>{createError}</ErrorText>
          <div className="flex gap-2 mt-4">
            <PrimaryButton onClick={handleCreate} disabled={!newDeptName.trim() || createDepartment.isPending} className="flex-1">
              {createDepartment.isPending ? "جارٍ الإنشاء..." : "إنشاء"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setCreating(false)} className="flex-1">
              إلغاء
            </SecondaryButton>
          </div>
        </Modal>
      )}

      {editingDept && (
        <Modal title={`تعديل — ${editingDept.name}`} onClose={() => setEditingDept(null)}>
          <FieldLabel>اسم القسم</FieldLabel>
          <TextInput value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
          <div className="mb-3" />
          <FieldLabel>القسم الأب</FieldLabel>
          <select
            value={editParentId}
            onChange={(e) => setEditParentId(e.target.value)}
            className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink"
          >
            <option value="">بدون — قسم رئيسي تابع للشركة مباشرة</option>
            {allDepartments
              .filter((d) => d.id !== editingDept.id && !getSubtreeDepartmentIds(allDepartments, editingDept.id).has(d.id))
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
          <ErrorText>{editError}</ErrorText>
          <div className="flex gap-2 mt-4">
            <PrimaryButton onClick={handleSaveEdit} disabled={!editName.trim() || updateDepartment.isPending} className="flex-1">
              {updateDepartment.isPending ? "جارٍ الحفظ..." : "حفظ"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setEditingDept(null)} className="flex-1">
              إلغاء
            </SecondaryButton>
            <IconButton
              icon={Trash2}
              label="حذف القسم"
              tone="critical"
              onClick={() => {
                setDeleteError("");
                setConfirmDeleteDept(editingDept);
              }}
            />
          </div>
        </Modal>
      )}

      {confirmDeleteDept && (
        <Modal title="تأكيد الحذف" onClose={() => setConfirmDeleteDept(null)}>
          <p className="text-sm text-ink-soft mb-5">
            هل أنت متأكد من حذف قسم "{confirmDeleteDept.name}"؟ سيتم فك ارتباط أي أقسام أو أعضاء تابعين له.
          </p>
          <ErrorText>{deleteError}</ErrorText>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setConfirmDeleteDept(null)} className="flex-1">
              إلغاء
            </SecondaryButton>
            <button
              onClick={handleDeleteDept}
              disabled={deleteDepartment.isPending}
              className="flex-1 py-2.5 rounded-lg bg-critical text-white border-none font-bold text-sm cursor-pointer disabled:opacity-50"
            >
              {deleteDepartment.isPending ? "جارٍ الحذف..." : "حذف نهائياً"}
            </button>
          </div>
        </Modal>
      )}

      {addingEmployee && (
        <EmployeeFormModal
          companyId={company.id}
          employee="new"
          departments={departments}
          levels={levels}
          classifications={classifications}
          jobTitles={jobTitles}
          employees={employeesList}
          onClose={() => setAddingEmployee(false)}
        />
      )}
    </div>
  );
}
