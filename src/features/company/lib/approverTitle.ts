import type { Company, Department, DepartmentMember } from "@/types/domain";

/** يحدّد المسمى الوظيفي المعروض لمعتمِد بند ما، بحسب صلاحيته الفعلية وقت الاعتماد
 * (رئيس قسم إدارة المشاريع / رئيس القسم المالي / الإدارة التنفيذية / مدير الحساب). */
export function approverTitle(
  userId: string,
  stageDeptType: "project_management" | "finance",
  company: Company,
  departments: Department[],
  members: DepartmentMember[]
): string {
  if (userId === company.createdBy) return "مدير الحساب";

  const headDept = departments.find(
    (d) => d.type === stageDeptType && members.some((m) => m.userId === userId && m.departmentId === d.id && m.role === "head")
  );
  if (headDept) {
    const headMember = members.find((m) => m.userId === userId && m.departmentId === headDept.id && m.role === "head");
    return headMember?.title || headDept.headLabel || "رئيس القسم";
  }

  const execDept = departments.find(
    (d) => d.type === "executive" && members.some((m) => m.userId === userId && m.departmentId === d.id)
  );
  if (execDept) {
    const execMember = members.find((m) => m.userId === userId && m.departmentId === execDept.id);
    return execMember?.title || "الإدارة التنفيذية";
  }

  return "—";
}
