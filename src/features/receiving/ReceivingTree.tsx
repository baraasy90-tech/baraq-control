import clsx from "clsx";
import { DecisionPill } from "@/features/receiving/DecisionPill";
import type { Activity } from "@/types/domain";

function buildChildrenMap(activities: Activity[]): Map<string | null, Activity[]> {
  const map = new Map<string | null, Activity[]>();
  for (const a of activities) {
    const list = map.get(a.parentId) ?? [];
    list.push(a);
    map.set(a.parentId, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.order - b.order);
  return map;
}

function TreeNode({
  activity,
  depth,
  childrenMap,
  selectedId,
  onSelect,
}: {
  activity: Activity;
  depth: number;
  childrenMap: Map<string | null, Activity[]>;
  selectedId: string | null;
  onSelect: (a: Activity) => void;
}) {
  const children = childrenMap.get(activity.id) ?? [];
  return (
    <div>
      <button
        onClick={() => onSelect(activity)}
        style={{ paddingRight: depth * 16 }}
        className={clsx(
          "w-full text-right flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer border-none",
          selectedId === activity.id ? "bg-primary-bg" : "bg-transparent hover:bg-bg"
        )}
      >
        <span className={clsx("text-sm truncate flex-1", selectedId === activity.id ? "font-bold text-ink" : "text-ink")}>
          {activity.name}
        </span>
        {activity.requiresReceiving && <DecisionPill submissions={activity.submissions} />}
      </button>
      {children.map((child) => (
        <TreeNode
          key={child.id}
          activity={child}
          depth={depth + 1}
          childrenMap={childrenMap}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function ReceivingTree({
  activities,
  selectedId,
  onSelect,
}: {
  activities: Activity[];
  selectedId: string | null;
  onSelect: (a: Activity) => void;
}) {
  const childrenMap = buildChildrenMap(activities);
  const roots = childrenMap.get(null) ?? [];

  if (roots.length === 0) {
    return <p className="text-sm text-ink-soft p-3">لا توجد مراحل بعد</p>;
  }

  return (
    <div>
      {roots.map((root) => (
        <TreeNode key={root.id} activity={root} depth={0} childrenMap={childrenMap} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}
