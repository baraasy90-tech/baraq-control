import { fmt, todayISO } from "@/utils/dates";
import { getCompletionDates } from "@/features/schedule/lib/completion";
import type { Activity, Schedule } from "@/types/domain";

/** يفترض أن `activities` وصلت بحقل done محسوباً مسبقاً عبر withComputedDone. */
export function ProjectPath({ activities, schedule }: { activities: Activity[]; schedule: Schedule }) {
  const completionDates = getCompletionDates(activities);

  const roots = activities
    .filter((a) => a.parentId === null && schedule[a.id])
    .sort((a, b) => (schedule[a.id].start < schedule[b.id].start ? -1 : 1));

  if (roots.length === 0) {
    return <p className="text-sm text-ink-soft">لا توجد مراحل مجدولة بعد</p>;
  }

  const t = todayISO();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {roots.map((a) => {
        const sc = schedule[a.id];
        const isLate = !a.done && t > sc.end;
        const isCurrent = !a.done && sc.start <= t && t <= sc.end;
        const completedOnTime = a.done && (() => {
          const d = completionDates.get(a.id);
          return !d || d <= sc.end;
        })();
        const tone = a.done ? (completedOnTime ? "doneOnTime" : "doneLate") : isLate ? "late" : isCurrent ? "current" : "upcoming";
        const styles: Record<string, string> = {
          doneOnTime: "bg-accent-bg text-accent border-accent/30",
          doneLate: "bg-done-late-bg text-done-late border-done-late/30",
          late: "bg-critical-bg text-critical border-critical/30",
          current: "bg-ink text-white border-ink",
          upcoming: "bg-bg text-ink-soft border-line",
        };
        return (
          <div
            key={a.id}
            title={`${a.name}: ${fmt(sc.start)} → ${fmt(sc.end)}`}
            className={`shrink-0 rounded-lg border px-3 py-2 min-w-[120px] ${styles[tone]}`}
          >
            <div className="text-xs font-bold truncate">{a.name}</div>
            <div className="text-[10px] font-mono opacity-80 mt-0.5">
              {fmt(sc.start)} → {fmt(sc.end)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
