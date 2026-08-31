import type { Activity } from "@/types/domain";

export function getPlannedAmount(node: Activity): number {
  const manual =
    node.budgetType === "lumpsum"
      ? node.plannedAmount || 0
      : node.budgetType === "boq"
        ? (node.boqQty || 0) * (node.boqUnitPrice || 0)
        : 0;
  if (node.linkedContractId) {
    return node.linkedContractStatus === "approved" ? node.linkedContractValue || 0 : manual;
  }
  return manual;
}

/** رقم مبدئي مبكر (قبل وجود عقد أو ميزانية رسمية) — مرجعي بحت، لا يدخل ضمن "المخطط". */
export function getEstimatedAmount(node: Activity): number {
  return node.budgetType === "estimated" ? node.plannedAmount || 0 : 0;
}

export function getActualAmount(node: Activity): number {
  return (node.actualEntries || []).filter((e) => e.status === "approved").reduce((s, e) => s + (e.amount || 0), 0);
}

export interface BudgetRollup {
  planned: number;
  actual: number;
  estimated: number;
  variance: number;
  variancePct: number;
}

/**
 * تجميع الميزانية (تقديري/مخطط/فعلي) لفرع كامل: مجموع قيمة العقدة نفسها + كل أبنائها
 */
export function computeBudgetRollup(rootId: string, activities: Activity[]): BudgetRollup {
  const idsToSum = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    activities.forEach((a) => {
      if (a.parentId && idsToSum.has(a.parentId) && !idsToSum.has(a.id)) {
        idsToSum.add(a.id);
        changed = true;
      }
    });
  }
  let planned = 0;
  let actual = 0;
  let estimated = 0;
  activities.forEach((a) => {
    if (idsToSum.has(a.id)) {
      planned += getPlannedAmount(a);
      actual += getActualAmount(a);
      estimated += getEstimatedAmount(a);
    }
  });
  return {
    planned,
    actual,
    estimated,
    variance: planned - actual,
    variancePct: planned > 0 ? Math.round(((planned - actual) / planned) * 100) : 0,
  };
}
