import type { Department, DepartmentMember } from "@/types/domain";

export interface EffectiveHead {
  member: DepartmentMember;
  /** true لو الرئاسة موروثة من قسم أب (لا يوجد رئيس مباشر لهذا القسم تحديداً). */
  inherited: boolean;
  /** اسم القسم الذي وُرِّثت منه الرئاسة (فقط لو inherited). */
  fromDeptName?: string;
}

/** يبحث عن رئيس القسم الفعلي: رئيس مباشر إن وُجد، وإلا رئيس أقرب قسم أب بالسلسلة
 * الهرمية (رئاسة القسم تُورَّث تلقائياً للأقسام الفرعية بلا رئيس خاص بها). */
export function findEffectiveHead(
  dept: Department,
  departments: Department[],
  members: DepartmentMember[]
): EffectiveHead | null {
  const direct = members.find((m) => m.departmentId === dept.id && m.role === "head");
  if (direct) return { member: direct, inherited: false };

  let current = dept;
  while (current.parentDepartmentId) {
    const parent = departments.find((d) => d.id === current.parentDepartmentId);
    if (!parent) return null;
    const parentHead = members.find((m) => m.departmentId === parent.id && m.role === "head");
    if (parentHead) return { member: parentHead, inherited: true, fromDeptName: parent.name };
    current = parent;
  }
  return null;
}

/** كل معرّفات الأقسام التي يملك فيها المستخدم صلاحية إدارة فعلية: رئاسة مباشرة، أو
 * رئاسة أي قسم أب بالسلسلة الهرمية (موروثة للأبناء تلقائياً). */
export function manageableDepartmentIdsFor(
  userId: string,
  departments: Department[],
  members: DepartmentMember[]
): Set<string> {
  const directHeadDeptIds = new Set(
    members.filter((m) => m.userId === userId && m.role === "head").map((m) => m.departmentId)
  );
  const result = new Set<string>();
  for (const dept of departments) {
    let current: Department | undefined = dept;
    while (current) {
      if (directHeadDeptIds.has(current.id)) {
        result.add(dept.id);
        break;
      }
      current = departments.find((d) => d.id === current!.parentDepartmentId);
    }
  }
  return result;
}
