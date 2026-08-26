import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, SecondaryButton, IconButton, Modal } from "@/components/ui";
import { useEmployees, useDeleteEmployee } from "@/features/company/api/useEmployees";
import { useDepartments } from "@/features/company/api/useDepartments";
import { useOrganizationalLevels } from "@/features/company/api/useOrganizationalLevels";
import { useOrganizationalClassifications } from "@/features/company/api/useOrganizationalClassifications";
import { useJobTitles } from "@/features/company/api/useJobTitles";
import { EmployeeFormModal } from "@/features/company/EmployeeFormModal";
import type { Employee, EmployeeStatus } from "@/types/domain";

const STATUS_LABEL: Record<EmployeeStatus, string> = {
  active: "نشط",
  invited: "دُعي، بانتظار القبول",
  pending: "بانتظار الدعوة",
  inactive: "غير نشط",
};
const STATUS_TONE: Record<EmployeeStatus, string> = {
  active: "text-accent bg-accent-bg",
  invited: "text-warn bg-warn-bg",
  pending: "text-ink-soft bg-panel border border-line/60",
  inactive: "text-critical bg-critical-bg",
};

export function EmployeesScreen({ companyId, canEdit }: { companyId: string; canEdit: boolean }) {
  const employeesQuery = useEmployees(companyId);
  const employees = employeesQuery.data ?? [];
  const departmentsQuery = useDepartments(companyId);
  const departments = departmentsQuery.data ?? [];
  const levelsQuery = useOrganizationalLevels(companyId);
  const levels = levelsQuery.data ?? [];
  const classificationsQuery = useOrganizationalClassifications(companyId);
  const classifications = classificationsQuery.data ?? [];
  const jobTitlesQuery = useJobTitles(companyId);
  const jobTitles = jobTitlesQuery.data ?? [];

  const del = useDeleteEmployee(companyId);

  const departmentById = new Map(departments.map((d) => [d.id, d]));
  const levelById = new Map(levels.map((l) => [l.id, l]));
  const classificationById = new Map(classifications.map((c) => [c.id, c]));
  const jobTitleById = new Map(jobTitles.map((j) => [j.id, j]));
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  const [editing, setEditing] = useState<Employee | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Employee | null>(null);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-ink">الموظفون</h2>
          <p className="text-xs text-ink-soft mt-0.5">
            يشمل كل من له حساب دخول فعلي بالفريق، بالإضافة لأي موظف تُجهّزه هنا بالهيكل قبل إرسال دعوته لاحقاً من
            "نشاط الأعضاء". تعديل القسم/المستوى هنا لا يغيّر عضويته الفعلية بالقسم — تلك تُدار من "نشاط الأعضاء".
          </p>
        </div>
        {canEdit && (
          <SecondaryButton onClick={() => setEditing("new")} className="text-xs px-3 py-1.5 inline-flex items-center gap-1 shrink-0">
            <Plus size={14} /> إضافة موظف قبل الدعوة
          </SecondaryButton>
        )}
      </div>

      {employees.length === 0 ? (
        <p className="text-sm text-ink-soft">لا يوجد موظفون بعد.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {employees.map((e) => {
            const manager = e.directManagerEmployeeId ? employeeById.get(e.directManagerEmployeeId) : undefined;
            const directReports = employees.filter((other) => other.directManagerEmployeeId === e.id);
            return (
              <div key={e.id} className="flex items-center justify-between gap-2 bg-bg border border-line/60 rounded-lg px-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-ink">{e.fullName}</span>
                    <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${STATUS_TONE[e.status]}`}>
                      {STATUS_LABEL[e.status]}
                    </span>
                  </div>
                  <div className="text-xs text-ink-soft mt-1 flex items-center gap-1.5 flex-wrap">
                    {e.departmentId && departmentById.get(e.departmentId) && <span>{departmentById.get(e.departmentId)!.name}</span>}
                    {e.jobTitleId && jobTitleById.get(e.jobTitleId) && <span>— {jobTitleById.get(e.jobTitleId)!.name}</span>}
                    {e.organizationalLevelId && levelById.get(e.organizationalLevelId) && (
                      <span className="text-[10px] text-accent bg-accent-bg rounded-full px-1.5 py-0.5">
                        {levelById.get(e.organizationalLevelId)!.name}
                      </span>
                    )}
                    {e.organizationalClassificationId && classificationById.get(e.organizationalClassificationId) && (
                      <span className="text-[10px] text-warn bg-warn-bg rounded-full px-1.5 py-0.5">
                        {classificationById.get(e.organizationalClassificationId)!.name}
                      </span>
                    )}
                    {manager && <span>— يتبع لـ: {manager.fullName}</span>}
                    {directReports.length > 0 && (
                      <span>— يُدير {directReports.length} {directReports.length === 1 ? "شخصاً" : "أشخاص"} مباشرة</span>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <IconButton icon={Pencil} label="تعديل" onClick={() => setEditing(e)} />
                    <IconButton icon={Trash2} label="حذف" tone="critical" onClick={() => setConfirmDelete(e)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <EmployeeFormModal
          companyId={companyId}
          employee={editing}
          departments={departments}
          levels={levels}
          classifications={classifications}
          jobTitles={jobTitles}
          employees={employees}
          onClose={() => setEditing(null)}
        />
      )}

      {confirmDelete && (
        <Modal title="تأكيد الحذف" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-ink-soft mb-5">
            هل أنت متأكد من حذف سجل "{confirmDelete.fullName}"؟ لن يُحذف حسابه أو عضويته الفعلية بالقسم إن كان لديه
            حساب مرتبط بالفعل — فقط سجل بيانات الموظف الإضافي هذا.
          </p>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setConfirmDelete(null)} className="flex-1">إلغاء</SecondaryButton>
            <button
              onClick={async () => {
                await del.mutateAsync(confirmDelete.id);
                setConfirmDelete(null);
              }}
              className="flex-1 py-2.5 rounded-lg bg-critical text-white border-none font-bold text-sm cursor-pointer"
            >
              حذف نهائياً
            </button>
          </div>
        </Modal>
      )}
    </Card>
  );
}
