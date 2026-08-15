import { useNavigate } from "react-router-dom";
import { SecondaryButton, Card } from "@/components/ui";
import { useActivities } from "@/features/schedule/api/useActivities";
import { computeSchedule } from "@/features/schedule/lib/schedule";
import { withComputedDone, getCompletionDates } from "@/features/schedule/lib/completion";
import { fmt, todayISO } from "@/utils/dates";
import type { Activity, Schedule } from "@/types/domain";
import type { Project } from "@/types/domain";

const dayMs = 86400000;
const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / dayMs);

interface Row {
  activity: Activity;
  depth: number;
}

function flattenTree(activities: Activity[]): Row[] {
  const childrenMap = new Map<string | null, Activity[]>();
  for (const a of activities) {
    const list = childrenMap.get(a.parentId) ?? [];
    list.push(a);
    childrenMap.set(a.parentId, list);
  }
  for (const list of childrenMap.values()) list.sort((a, b) => a.order - b.order);

  const rows: Row[] = [];
  function walk(parentId: string | null, depth: number) {
    for (const a of childrenMap.get(parentId) ?? []) {
      rows.push({ activity: a, depth });
      walk(a.id, depth + 1);
    }
  }
  walk(null, 0);
  return rows;
}

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-SA", { month: "short", year: "2-digit" });
}

export function GanttScreen({ project }: { project: Project }) {
  const navigate = useNavigate();
  const activitiesQuery = useActivities(project.id);
  const activities = withComputedDone(activitiesQuery.data ?? []);
  const schedule = computeSchedule(activities);
  const completionDates = getCompletionDates(activities);
  const rows = flattenTree(activities).filter((r) => schedule[r.activity.id]);

  if (activitiesQuery.isLoading) {
    return <p className="text-sm text-ink-soft p-6">جارٍ التحميل...</p>;
  }

  if (rows.length === 0) {
    return (
      <div className="min-h-screen p-4 sm:p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-2">
          <h1 className="text-lg font-bold text-ink truncate">الجدول الزمني — {project.name}</h1>
          <SecondaryButton onClick={() => navigate(`/projects/${project.id}`)}>رجوع</SecondaryButton>
        </div>
        <div className="bg-panel border border-dashed border-line rounded-xl p-10 text-center text-sm text-ink-soft">
          لا توجد مراحل مجدولة بعد لعرضها كجدول زمني
        </div>
      </div>
    );
  }

  const starts = rows.map((r) => schedule[r.activity.id].start);
  const ends = rows.map((r) => schedule[r.activity.id].end);
  const rangeStart = starts.reduce((min, s) => (s < min ? s : min));
  const rangeEndRaw = ends.reduce((max, e) => (e > max ? e : max));
  const rangeEnd = daysBetween(rangeStart, rangeEndRaw) < 1 ? new Date(new Date(rangeStart).getTime() + dayMs).toISOString().slice(0, 10) : rangeEndRaw;
  const totalDays = Math.max(1, daysBetween(rangeStart, rangeEnd));

  const months: { iso: string; leftPct: number }[] = [];
  {
    const cursor = new Date(rangeStart);
    cursor.setDate(1);
    while (cursor.toISOString().slice(0, 10) <= rangeEnd) {
      const iso = cursor.toISOString().slice(0, 10);
      if (iso >= rangeStart || months.length === 0) {
        const offset = Math.max(0, daysBetween(rangeStart, iso));
        months.push({ iso, leftPct: (offset / totalDays) * 100 });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  const t = todayISO();
  const todayOffset = daysBetween(rangeStart, t);
  const todayPct = todayOffset >= 0 && todayOffset <= totalDays ? (todayOffset / totalDays) * 100 : null;

  const toneStyle = (activity: Activity, sc: Schedule[string]): string => {
    const isLate = !activity.done && t > sc.end;
    const isCurrent = !activity.done && sc.start <= t && t <= sc.end;
    if (activity.done) {
      const d = completionDates.get(activity.id);
      const onTime = !d || d <= sc.end;
      return onTime ? "bg-accent" : "bg-done-late";
    }
    if (isLate) return "bg-critical";
    if (isCurrent) return "bg-ink";
    return "bg-line";
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-2">
        <h1 className="text-lg font-bold text-ink truncate">الجدول الزمني — {project.name}</h1>
        <SecondaryButton onClick={() => navigate(`/projects/${project.id}`)}>رجوع</SecondaryButton>
      </div>

      <Card className="overflow-x-auto">
        <div style={{ minWidth: 700 }}>
          <div className="flex border-b border-line/60 pb-2 mb-2">
            <div className="w-48 shrink-0 text-xs font-bold text-ink-soft">البند</div>
            <div className="flex-1 relative h-5">
              {months.map((m) => (
                <div
                  key={m.iso}
                  className="absolute top-0 text-[10px] text-ink-soft font-mono border-r border-line/60 pr-1.5"
                  style={{ left: `${m.leftPct}%` }}
                >
                  {monthLabel(m.iso)}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {rows.map(({ activity, depth }) => {
              const sc = schedule[activity.id];
              const offset = Math.max(0, daysBetween(rangeStart, sc.start));
              const duration = Math.max(1, daysBetween(sc.start, sc.end));
              const leftPct = (offset / totalDays) * 100;
              const widthPct = (duration / totalDays) * 100;
              return (
                <div key={activity.id} className="flex items-center">
                  <div
                    className="w-48 shrink-0 text-xs text-ink truncate pl-2"
                    style={{ paddingRight: depth * 12 }}
                    title={activity.name}
                  >
                    {activity.name}
                  </div>
                  <div className="flex-1 relative h-6 bg-bg rounded">
                    {todayPct !== null && (
                      <div className="absolute top-0 bottom-0 w-px bg-primary z-10" style={{ left: `${todayPct}%` }} />
                    )}
                    <div
                      title={`${fmt(sc.start)} → ${fmt(sc.end)}`}
                      className={`absolute top-0.5 bottom-0.5 rounded ${toneStyle(activity, sc)}`}
                      style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 1.5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3 mt-4 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-accent" /> منتهٍ بالموعد
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-done-late" /> منتهٍ متأخراً
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-ink" /> جارٍ حالياً
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-critical" /> متأخر عن الموعد
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-line" /> قادم
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-0.5 h-2.5 bg-primary" /> اليوم
        </span>
      </div>
    </div>
  );
}
