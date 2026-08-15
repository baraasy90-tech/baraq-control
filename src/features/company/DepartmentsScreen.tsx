import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SecondaryButton, Card } from "@/components/ui";
import { useCompany } from "@/features/company/useCompany";
import { useDepartments } from "@/features/company/api/useDepartments";
import { useDepartmentMembers } from "@/features/company/api/useDepartmentMembers";
import { useMemberWorkSummaries } from "@/features/company/api/useMemberWork";
import type { DepartmentType } from "@/types/domain";

const DEPARTMENT_TYPE_LABEL: Record<DepartmentType, string> = {
  project_management: "إدارة المشاريع",
  finance: "الإدارة المالية",
  hr: "الموارد البشرية",
  executive: "مدير الحساب",
  custom: "قسم مخصص",
};

const ROLE_LABEL: Record<string, string> = { member: "عضو", head: "رئيس القسم" };

function roleLabel(dept: { headLabel: string | null; memberLabel: string | null } | undefined, role: string): string {
  if (!dept) return ROLE_LABEL[role] ?? role;
  if (role === "head") return dept.headLabel || ROLE_LABEL.head;
  return dept.memberLabel || ROLE_LABEL.member;
}

export function DepartmentsScreen() {
  const navigate = useNavigate();
  const { company, profile } = useCompany();
  const departmentsQuery = useDepartments(company.id);
  const allDepartments = departmentsQuery.data ?? [];
  const membersQuery = useDepartmentMembers(allDepartments.map((d) => d.id));
  const members = membersQuery.data ?? [];

  const isOwner = company.createdBy === profile.id;
  const isExecutive = members.some(
    (m) => m.userId === profile.id && allDepartments.find((d) => d.id === m.departmentId)?.type === "executive"
  );
  const headDepartmentIds = new Set(
    members.filter((m) => m.userId === profile.id && m.role === "head").map((m) => m.departmentId)
  );

  const canSeeAll = isOwner || isExecutive;
  const departments = canSeeAll ? allDepartments : allDepartments.filter((d) => headDepartmentIds.has(d.id));

  const memberUserIds = [...new Set(members.filter((m) => departments.some((d) => d.id === m.departmentId)).map((m) => m.userId))];
  const workQuery = useMemberWorkSummaries(memberUserIds);
  const workByUser = workQuery.data;

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isLoading = departmentsQuery.isLoading || membersQuery.isLoading;

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-2 gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-ink">الأقسام</h1>
        <SecondaryButton onClick={() => navigate("/")} className="text-sm">
          رجوع
        </SecondaryButton>
      </div>
      <p className="text-xs text-ink-soft mb-6">
        عرض للاطلاع على نشاط الأعضاء ونسب الإنجاز فقط — لا يمكن اعتماد أو إنجاز أي مرحلة من هذه الشاشة.
      </p>

      {isLoading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}

      {!isLoading && !canSeeAll && departments.length === 0 && (
        <div className="bg-panel border border-dashed border-line rounded-xl p-10 text-center text-sm text-ink-soft">
          هذه الشاشة مخصصة للإدارة التنفيذية ورؤساء الأقسام
        </div>
      )}

      {!isLoading && canSeeAll && departments.length === 0 && (
        <div className="bg-panel border border-dashed border-line rounded-xl p-10 text-center text-sm text-ink-soft">
          لا توجد أقسام بعد — يمكنك إنشاء قسم جديد من لوحة التحكم
        </div>
      )}

      <div className="flex flex-col gap-3">
        {departments.map((dept) => {
          const deptMembers = members.filter((m) => m.departmentId === dept.id);
          const isOpen = expandedId === dept.id;

          return (
            <Card key={dept.id} className="p-0 overflow-hidden">
              <button
                onClick={() => setExpandedId(isOpen ? null : dept.id)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-transparent border-none cursor-pointer text-right"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-bold text-ink truncate">{dept.name}</span>
                  <span className="text-[10px] text-ink-soft bg-bg border border-line/60 rounded-full px-1.5 py-0.5 shrink-0">
                    {DEPARTMENT_TYPE_LABEL[dept.type]}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs text-ink-soft">
                  <span>{deptMembers.length} عضو</span>
                  <span className="text-ink-soft">{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 border-t border-line/60 flex flex-col gap-3">
                  {deptMembers.length === 0 ? (
                    <p className="text-xs text-ink-soft">لا يوجد أعضاء بعد</p>
                  ) : (
                    deptMembers.map((m) => {
                      const work = workByUser?.get(m.userId);
                      return (
                        <div key={m.id} className="bg-bg rounded-lg p-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-sm font-semibold text-ink">{m.fullName}</span>
                            <span className="text-xs text-ink-soft bg-panel border border-line/60 rounded-full px-2 py-0.5">
                              {roleLabel(dept, m.role)}
                            </span>
                          </div>

                          {!work || (work.currentPhases.length === 0 && !work.previousPhase && work.criticalPhases.length === 0) ? (
                            <p className="text-xs text-ink-soft">لا يوجد نشاط مسجّل على مشاريع بعد</p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 rounded-full bg-panel border border-line/60 overflow-hidden">
                                  <div
                                    className="h-full bg-primary"
                                    style={{ width: `${work.completionPct}%` }}
                                  />
                                </div>
                                <span className="text-xs font-bold text-ink shrink-0">{work.completionPct}%</span>
                              </div>

                              {work.currentPhases.length > 0 && (
                                <div className="text-xs text-ink-soft">
                                  <span className="font-semibold text-ink">المرحلة الحالية: </span>
                                  {work.currentPhases.map((p) => `${p.name} (${p.projectName})`).join("، ")}
                                </div>
                              )}

                              {work.previousPhase && (
                                <div className="text-xs text-ink-soft">
                                  <span className="font-semibold text-ink">آخر مرحلة سابقة: </span>
                                  {work.previousPhase.name} ({work.previousPhase.projectName})
                                </div>
                              )}

                              {work.criticalPhases.length > 0 && (
                                <div className="text-xs text-warn">
                                  <span className="font-semibold">بنود تحتاج طلباً وتوريداً قريباً: </span>
                                  {work.criticalPhases
                                    .map((p) => `${p.name} (${p.projectName}) — خلال ${p.daysToStart} يوم`)
                                    .join("، ")}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
