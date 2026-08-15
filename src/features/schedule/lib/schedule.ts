import type { Activity, Schedule } from "@/types/domain";
import { addByCalendar, addDays, todayISO } from "@/utils/dates";

export const REL_LABEL: Record<"SS" | "FS", string> = {
  SS: "يبدأ مع بداية السابق",
  FS: "يبدأ بعد نهاية السابق",
};

export const LAG_UNIT_LABEL: Record<"day" | "month", string> = { day: "يوم", month: "شهر" };

export const lagToDays = (lag: number | null | undefined, unit: "day" | "month"): number =>
  unit === "month" ? (lag || 0) * 30 : lag || 0;

/**
 * الجدولة: كل نشاط إما له تاريخ بداية يدوي، أو مرتبط ببند سابق (Dependency):
 * - SS (يبدأ مع بداية السابق): start = predecessor.start + مهلة
 * - FS (يبدأ بعد نهاية السابق): start = predecessor.end + مهلة
 * تُحل الروابط بشكل تراجعي (recursive) مع حماية من الحلقات الدائرية.
 */
export function computeSchedule(activities: Activity[]): Schedule {
  const byId: Record<string, Activity> = {};
  activities.forEach((a) => (byId[a.id] = a));
  const schedule: Record<string, { start: string; end: string } | null> = {};
  const visiting = new Set<string>();

  function resolve(id: string): { start: string; end: string } | null {
    if (id in schedule) return schedule[id];
    const a = byId[id];
    if (!a || visiting.has(id)) return null;
    visiting.add(id);

    let start: string | null = null;
    if (a.dependsOn && byId[a.dependsOn]) {
      const pred = resolve(a.dependsOn);
      if (pred) {
        const base = a.depType === "SS" ? pred.start : pred.end;
        start = addDays(base, lagToDays(a.lagDays, a.lagUnit));
      }
    } else {
      start = a.startDate || null;
    }

    const end = start ? addByCalendar(start, a.durationDays, a.calendarType) : null;
    const result = start && end ? { start, end } : null;
    schedule[id] = result;
    visiting.delete(id);
    return result;
  }

  activities.forEach((a) => resolve(a.id));
  const clean: Schedule = {};
  Object.keys(schedule).forEach((k) => {
    const v = schedule[k];
    if (v) clean[k] = v;
  });
  return clean;
}

export function getCurrentPreviousNext(activities: Activity[], schedule: Schedule) {
  const roots = activities.filter((a) => a.parentId === null && schedule[a.id]);
  const t = todayISO();

  const current = roots
    .filter((r) => !r.done && schedule[r.id].start <= t)
    .sort((a, b) => (schedule[a.id].start < schedule[b.id].start ? 1 : -1));

  const doneOnes = roots.filter((r) => r.done).sort((a, b) => (schedule[a.id].end > schedule[b.id].end ? -1 : 1));
  const upcoming = roots
    .filter((r) => !r.done && schedule[r.id].start > t)
    .sort((a, b) => (schedule[a.id].start > schedule[b.id].start ? 1 : -1));

  return {
    current: current[0] || null,
    currentExtraCount: Math.max(0, current.length - 1),
    previous: doneOnes[0] || null,
    next: upcoming[0] || null,
  };
}

export function getLatePhases(activities: Activity[], schedule: Schedule) {
  const t = todayISO();
  return activities
    .filter((a) => a.parentId === null && !a.done && schedule[a.id] && t > schedule[a.id].end)
    .map((a) => ({ ...a, ...schedule[a.id] }));
}

export function getCriticalUpcoming(activities: Activity[], schedule: Schedule) {
  const t = todayISO();
  return activities
    .filter((a) => a.critical && !a.done && schedule[a.id])
    .map((a) => ({
      ...a,
      daysToStart: Math.round((new Date(schedule[a.id].start).getTime() - new Date(t).getTime()) / 86400000),
      leadDays: a.alertLeadDays ?? 7,
    }))
    .filter((a) => a.daysToStart <= a.leadDays)
    .sort((a, b) => a.daysToStart - b.daysToStart);
}
