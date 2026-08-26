import { useState } from "react";
import { PrimaryButton, SecondaryButton, ErrorText, FieldLabel, TextInput, Modal } from "@/components/ui";
import { useSaveEmployee } from "@/features/company/api/useEmployees";
import { getErrorMessage } from "@/utils/errors";
import type { Employee, Department, OrganizationalLevel, OrganizationalClassification, JobTitle } from "@/types/domain";

export function EmployeeFormModal({
  companyId,
  employee,
  departments,
  levels,
  classifications,
  jobTitles,
  employees,
  defaultDepartmentId,
  onClose,
}: {
  companyId: string;
  employee: Employee | "new";
  departments: Department[];
  levels: OrganizationalLevel[];
  classifications: OrganizationalClassification[];
  jobTitles: JobTitle[];
  employees: Employee[];
  defaultDepartmentId?: string | null;
  onClose: () => void;
}) {
  const save = useSaveEmployee();
  const isNew = employee === "new";

  const [fullName, setFullName] = useState(isNew ? "" : employee.fullName);
  const [email, setEmail] = useState(isNew ? "" : employee.email ?? "");
  const [phone, setPhone] = useState(isNew ? "" : employee.phone ?? "");
  const [departmentId, setDepartmentId] = useState(isNew ? defaultDepartmentId ?? "" : employee.departmentId ?? "");
  const [levelId, setLevelId] = useState(isNew ? "" : employee.organizationalLevelId ?? "");
  const [classificationId, setClassificationId] = useState(isNew ? "" : employee.organizationalClassificationId ?? "");
  const [jobTitleId, setJobTitleId] = useState(isNew ? "" : employee.jobTitleId ?? "");
  const [managerId, setManagerId] = useState(isNew ? "" : employee.directManagerEmployeeId ?? "");
  const [error, setError] = useState("");

  const managerCandidates = employees.filter((e) => isNew || e.id !== employee.id);

  const handleSave = async () => {
    if (!fullName.trim()) return;
    setError("");
    try {
      await save.mutateAsync({
        id: isNew ? undefined : employee.id,
        companyId,
        fullName: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        departmentId: departmentId || null,
        organizationalLevelId: levelId || null,
        organizationalClassificationId: classificationId || null,
        jobTitleId: jobTitleId || null,
        directManagerEmployeeId: managerId || null,
        status: isNew ? "pending" : employee.status,
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "تعذّر الحفظ، حاول مجدداً"));
    }
  };

  return (
    <Modal title={isNew ? "إضافة موظف قبل الدعوة" : "تعديل بيانات الموظف"} onClose={onClose}>
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
      <select
        value={departmentId}
        onChange={(e) => setDepartmentId(e.target.value)}
        className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink"
      >
        <option value="">— بلا قسم —</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <div className="mb-3" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <FieldLabel>المستوى الإداري</FieldLabel>
          <select
            value={levelId}
            onChange={(e) => setLevelId(e.target.value)}
            className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink"
          >
            <option value="">— بلا مستوى —</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>التصنيف</FieldLabel>
          <select
            value={classificationId}
            onChange={(e) => setClassificationId(e.target.value)}
            className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink"
          >
            <option value="">— بلا تصنيف —</option>
            {classifications.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mb-3" />

      <FieldLabel>المسمّى الوظيفي</FieldLabel>
      <select
        value={jobTitleId}
        onChange={(e) => setJobTitleId(e.target.value)}
        className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink"
      >
        <option value="">— بلا مسمّى —</option>
        {jobTitles.map((j) => (
          <option key={j.id} value={j.id}>
            {j.name}
          </option>
        ))}
      </select>
      <div className="mb-3" />

      <FieldLabel>المدير المباشر (اختياري)</FieldLabel>
      <select
        value={managerId}
        onChange={(e) => setManagerId(e.target.value)}
        className="w-full bg-bg border border-line/60 rounded-lg px-3 py-2 text-sm text-ink"
      >
        <option value="">— بلا مدير مباشر —</option>
        {managerCandidates.map((m) => (
          <option key={m.id} value={m.id}>
            {m.fullName}
          </option>
        ))}
      </select>

      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2 mt-4">
        <PrimaryButton onClick={handleSave} disabled={!fullName.trim() || save.isPending} className="flex-1">
          {save.isPending ? "جارٍ الحفظ..." : "حفظ"}
        </PrimaryButton>
        <SecondaryButton onClick={onClose} className="flex-1">
          إلغاء
        </SecondaryButton>
      </div>
    </Modal>
  );
}
