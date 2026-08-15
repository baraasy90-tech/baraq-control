import type { Activity, ActiveScope, Schedule } from "@/types/domain";

export const SCOPE_LABEL: Record<string, string> = {
  project: "المشروع ككل",
  zone: "زون",
  unit: "وحدة",
  facility: "منشأة مستقلة",
};

export function getRootOf(nodeId: string, activities: Activity[]): Activity | null {
  const byId: Record<string, Activity> = {};
  activities.forEach((a) => (byId[a.id] = a));
  let cur = byId[nodeId];
  while (cur && cur.parentId) {
    cur = byId[cur.parentId];
  }
  return cur || null;
}

export function getRootScope(nodeId: string, activities: Activity[]) {
  const root = getRootOf(nodeId, activities);
  if (!root) return { scopeType: "project" as const, scopeRef: null };
  return { scopeType: root.scopeType || "project", scopeRef: root.scopeRef || null };
}

/**
 * تصفية الشجرة حسب النطاق النشط: نطاقات المشروع تظهر دائماً + نطاق الوحدة/الزون/المنشأة المختارة فقط
 */
export function filterActivitiesByScope(activities: Activity[], activeScope: ActiveScope | null): Activity[] {
  if (!activeScope || activeScope.type === "all") return activities;
  const visibleRootIds = new Set<string>();
  activities
    .filter((a) => a.parentId === null)
    .forEach((root) => {
      const st = root.scopeType || "project";
      if (st === "project") {
        visibleRootIds.add(root.id);
      } else if (st === activeScope.type && root.scopeRef === activeScope.ref) {
        visibleRootIds.add(root.id);
      }
    });
  const keep = new Set<string>();
  const addWithDescendants = (rootId: string) => {
    keep.add(rootId);
    let changed = true;
    while (changed) {
      changed = false;
      activities.forEach((a) => {
        if (a.parentId && keep.has(a.parentId) && !keep.has(a.id)) {
          keep.add(a.id);
          changed = true;
        }
      });
    }
  };
  visibleRootIds.forEach(addWithDescendants);
  return activities.filter((a) => keep.has(a.id));
}

export function findNearestReceivingPredecessor(node: Activity, activities: Activity[]): Activity | null {
  let cur: Activity | undefined = node;
  while (cur && cur.dependsOn) {
    const pred = activities.find((a) => a.id === cur!.dependsOn);
    if (!pred) return null;
    if (pred.requiresReceiving) return pred;
    cur = pred;
  }
  return null;
}

export type ReceivingGate =
  | { unlocked: true }
  | { unlocked: false; reason: "date"; date: string | null }
  | { unlocked: false; reason: "predecessor"; predecessor: Activity };

/**
 * هل استلام هذا البند مفعّل؟ يعتمد على: وصول تاريخ البداية + اعتماد المرحلة السابقة (بالصور) إن وُجدت
 */
export function getReceivingGate(node: Activity, activities: Activity[], schedule: Schedule): ReceivingGate {
  const t = new Date().toISOString().slice(0, 10);
  const sc = schedule[node.id];
  if (!sc || sc.start > t) {
    return { unlocked: false, reason: "date", date: sc ? sc.start : null };
  }
  const pred = findNearestReceivingPredecessor(node, activities);
  if (pred) {
    const subs = pred.submissions || [];
    const latest = subs[subs.length - 1];
    const hasImages =
      !!latest && ((latest.images && latest.images.length > 0) || (latest.checklistResults || []).some((c) => c.imageUrl));
    const approved = !!latest && latest.decision === "approved" && hasImages;
    if (!approved) {
      return { unlocked: false, reason: "predecessor", predecessor: pred };
    }
  }
  return { unlocked: true };
}
