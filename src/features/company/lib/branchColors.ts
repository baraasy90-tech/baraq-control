import type { Department } from "@/types/domain";

/** لون مميز لكل قسم رئيسي تابع مباشرة للمدير التنفيذي — وكل الأقسام والمنسوبين
 * الأسفل منه يأخذون تدرجات أفتح من نفس اللون، ليكون معياراً بصرياً ثابتاً يوضّح
 * فوراً أي "فرع" بالهيكل التنظيمي ينتمي إليه أي قسم فرعي مهما عمق مستواه. */
const BRANCH_PALETTE = ["#2E6FE8", "#E86B2C", "#2E9E52", "#8B5CF6", "#D64545", "#0EA5A6", "#DFA22E", "#EC4899"];

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export function computeBranchColors(roots: Department[], departments: Department[]): Map<string, string> {
  const colors = new Map<string, string>();

  roots.forEach((root, i) => {
    const base = BRANCH_PALETTE[i % BRANCH_PALETTE.length];

    function assign(dept: Department, depth: number) {
      colors.set(dept.id, depth === 0 ? base : lighten(base, Math.min(depth * 0.22, 0.7)));
      departments.filter((d) => d.parentDepartmentId === dept.id).forEach((c) => assign(c, depth + 1));
    }

    assign(root, 0);
  });

  return colors;
}

export function branchLegend(roots: Department[]): { name: string; color: string }[] {
  return roots.map((r, i) => ({ name: r.name, color: BRANCH_PALETTE[i % BRANCH_PALETTE.length] }));
}
