import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, SecondaryButton, PrimaryButton, IconButton, ErrorText, FieldLabel, TextInput, Modal } from "@/components/ui";
import { useEmployees, useSaveEmployee, useDeleteEmployee } from "@/features/company/api/useEmployees";
import { useDepartments } from "@/features/company/api/useDepartments";
import { useOrganizationalLevels } from "@/features/company/api/useOrganizationalLevels";
import { useOrganizationalClassifications } from "@/features/company/api/useOrganizationalClassifications";
import { useJobTitles } from "@/features/company/api/useJobTitles";
import { getErrorMessage } from "@/utils/errors";
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

  const save = useSaveEmployee();
  const del = useDeleteEmployee(companyId);

  const departmentById = new Map(departments.map((d) => [d.id, d]));
  const levelById = new Map(levels.map((l) => [l.id, l]));
  const classificationById = new Map(classifications.map((c) => [c.id, c]));
  const jobTitleById = new Map(jobTitles.map((j) => [j.id, j]));
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  const [editing, setEditing] = useState<Employee | "new" | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [classificationId, setClassificationId] = useState("");
  const [jobTitleId, setJobTitleId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Employee | null>(null);

  const openNew = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setDepartmentId("");
    setLevelId("");
    setClassificationId("");
    setJobTitleId("");
    setManagerId("");
    setError("");
    setEditing("new");
  };
  const openEdit = (e: Employee) => {
    setFullName(e.fullName);
    setEmail(e.email ?? "");
    setPhone(e.phone ?? "");
    setDepartmentId(e.departmentId ?? "");
    setLevelId(e.organizationalLevelId ?? "");
    setClassificationId(e.organizationalClassificationId ?? "");
    setJobTitleId(e.jobTitleId ?? "");
    setManagerId(e.directManagerEmployeeId ?? "");
    setError("");
    setEditing(e);
  };

  const handleSave = async () => {
    if (!fullName.trim()) return;
    setError("");
    try {
      await save.mutateAsync({
        id: editing !== "new" && editing ? editing.id : undefined,
        companyId,
        fullName: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        departmentId: departmentId || null,
        organizationalLevelId: levelId || null,
        organizationalClassificationId: classificationId || null,
        jobTitleId: jobTitleId || null,
        directManagerEmployeeId: managerId || null,
        status: editing !== "new" && editing ? editing.status : "pending",
      });
      setEditing(null);
    } catch (err) {
      setError(getErrorMessage(err, "تعذّر الحفظ، حاول مجدداً"));
    }
  };

  const managerCandidates = employees.filter((e) => !(editing !== "new" && editing && e.id === editing.id));

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
          <SecondaryButton onClick={openNew} className="text-xs px-3 py-1.5 inline-flex items-center gap-1 shrink-0">
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
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <IconButton icon={Pencil} label="تعديل" onClick={() => openEdit(e)} />
                    <IconButton icon={Trash2} label="حذف" tone="critical" onClick={() => setConfirmDelete(e)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal title={editing === "new" ? "إضافة موظف قبل الدعوة" : "تعديل بيانات الموظف"} onClose={() => setEditing(null)}>
          <FieldLabel>الاسم الكامل</FieldLabel>
          <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <div className="mb-3" />
          <FieldLabel>البريد الإلكتروني (لإرسال الدعوة لاحقاً)</FieldLabel>
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="mb-3" />
          <FieldLabel>الهاتف (اختياري)</FieldLabel>
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="mb-3" />

          <FieldLabel>القسم</FieldLabel>
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink">
            <option value="">— بلا قسم —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <div className="mb-3" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>المستوى الإداري</FieldLabel>
              <select value={levelId} onChange={(e) => setLevelId(e.target.value)} className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink">
                <option value="">— بلا مستوى —</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>التصنيف</FieldLabel>
              <select value={classificationId} onChange={(e) => setClassificationId(e.target.value)} className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink">
                <option value="">— بلا تصنيف —</option>
                {classifications.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-3" />

          <FieldLabel>المسمّى الوظيفي</FieldLabel>
          <select value={jobTitleId} onChange={(e) => setJobTitleId(e.target.value)} className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink">
            <option value="">— بلا مسمّى —</option>
            {jobTitles.map((j) => (
              <option key={j.id} value={j.id}>{j.name}</option>
            ))}
          </select>
          <div className="mb-3" />

          <FieldLabel>المدير المباشر (اختياري)</FieldLabel>
          <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink">
            <option value="">— بلا مدير مباشر —</option>
            {managerCandidates.map((m) => (
              <option key={m.id} value={m.id}>{m.fullName}</option>
            ))}
          </select>

          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2 mt-4">
            <PrimaryButton onClick={handleSave} disabled={!fullName.trim() || save.isPending} className="flex-1">
              {save.isPending ? "جارٍ الحفظ..." : "حفظ"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setEditing(null)} className="flex-1">إلغاء</SecondaryButton>
          </div>
        </Modal>
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
