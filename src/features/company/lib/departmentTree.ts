import type { Department } from "@/types/domain";

/** القسم نفسه + كل الأقسام الفرعية المتفرّعة منه مهما كان عمقها — لتجميع كل منسوبي
 * القسم فعلياً (من رئيسه حتى أصغر موظف بأي قسم فرعي تابع)، وليس الأعضاء المباشرين فقط. */
export function getSubtreeDepartmentIds(departments: Department[], rootId: string): Set<string> {
  const result = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const d of departments) {
      if (d.parentDepartmentId === id && !result.has(d.id)) {
        result.add(d.id);
        queue.push(d.id);
      }
    }
  }
  return result;
}
