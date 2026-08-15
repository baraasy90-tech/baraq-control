import type { Activity } from "@/types/domain";

function buildChildrenMap(activities: Activity[]): Map<string | null, Activity[]> {
  const map = new Map<string | null, Activity[]>();
  for (const a of activities) {
    const list = map.get(a.parentId) ?? [];
    list.push(a);
    map.set(a.parentId, list);
  }
  return map;
}

function isLeafComplete(node: Activity): boolean {
  if (node.requiresReceiving) {
    const latest = node.submissions[node.submissions.length - 1];
    return latest?.decision === "approved";
  }
  return node.done;
}

/**
 * بند بأبناء: مكتمل فقط إذا كل أبنائه المباشرين مكتملين.
 * بند بدون أبناء يتطلب استلاماً: مكتمل إذا آخر تقديم "معتمد نهائي".
 * بند بدون أبناء ولا يتطلب استلاماً: يعتمد على العلم اليدوي done.
 */
function computeDoneMap(activities: Activity[]): Map<string, boolean> {
  const childrenMap = buildChildrenMap(activities);
  const result = new Map<string, boolean>();

  function resolve(node: Activity): boolean {
    const cached = result.get(node.id);
    if (cached !== undefined) return cached;
    const children = childrenMap.get(node.id) ?? [];
    const done = children.length > 0 ? children.every((c) => resolve(c)) : isLeafComplete(node);
    result.set(node.id, done);
    return done;
  }

  activities.forEach(resolve);
  return result;
}

/** يعيد نسخة من الأنشطة بحقل done محسوباً تلقائياً (من الاستلامات/الأبناء) بدل القيمة اليدوية المخزّنة. */
export function withComputedDone(activities: Activity[]): Activity[] {
  const doneMap = computeDoneMap(activities);
  return activities.map((a) => ({ ...a, done: doneMap.get(a.id) ?? a.done }));
}

function resolveCompletionDate(node: Activity, childrenMap: Map<string | null, Activity[]>): string | null {
  const children = childrenMap.get(node.id) ?? [];
  if (children.length > 0) {
    const dates = children.map((c) => resolveCompletionDate(c, childrenMap));
    if (dates.some((d) => d === null)) return null;
    return (dates as string[]).sort().slice(-1)[0];
  }
  if (node.requiresReceiving) {
    const approved = [...node.submissions].reverse().find((s) => s.decision === "approved");
    return approved ? approved.createdAt.slice(0, 10) : null;
  }
  return null;
}

/** تاريخ اكتمال كل بند (أحدث تاريخ اعتماد ضمن فرعه)، أو null إن لم يكتمل أو تعذّر تحديده (إتمام يدوي). */
export function getCompletionDates(activities: Activity[]): Map<string, string | null> {
  const childrenMap = buildChildrenMap(activities);
  const map = new Map<string, string | null>();
  activities.forEach((a) => map.set(a.id, resolveCompletionDate(a, childrenMap)));
  return map;
}
