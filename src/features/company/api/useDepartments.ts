import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Department } from "@/types/domain";

/** يستخرج الرقم من بداية اسم القسم إن وُجد (مثال: "1 - المالية" ← 1) — يُستخدم
 * لترتيب العرض بدل الاعتماد على نوع القسم أو أسبقية الإنشاء. */
function leadingNumber(name: string): number | null {
  const match = name.match(/^\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/** الأقسام المرقَّمة أولاً بترتيب أرقامها تصاعدياً، ثم غير المرقَّمة أبجدياً — بغض
 * النظر عن نوع القسم أو تاريخ إنشائه. */
function sortDepartments(departments: Department[]): Department[] {
  return [...departments].sort((a, b) => {
    const aNum = leadingNumber(a.name);
    const bNum = leadingNumber(b.name);
    if (aNum !== null && bNum !== null) return aNum - bNum;
    if (aNum !== null) return -1;
    if (bNum !== null) return 1;
    return a.name.localeCompare(b.name, "ar");
  });
}

export function useDepartments(companyId: string | undefined) {
  return useQuery({
    queryKey: ["departments", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<Department[]> => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, company_id, name, type, head_label, member_label, parent_department_id, position_x, position_y")
        .eq("company_id", companyId!);
      if (error) throw error;
      const departments = data.map((d) => ({
        id: d.id,
        companyId: d.company_id,
        name: d.name,
        type: d.type,
        headLabel: d.head_label,
        memberLabel: d.member_label,
        parentDepartmentId: d.parent_department_id,
        positionX: d.position_x,
        positionY: d.position_y,
      }));
      return sortDepartments(departments);
    },
  });
}
