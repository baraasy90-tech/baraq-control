import type { Activity, Schedule } from "@/types/domain";
import { getPlannedAmount } from "@/features/budget/lib/budget";

export interface SCurvePoint {
  date: string;
  label: string;
  plannedCumulative: number;
  actualCumulative: number;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

/** منحنى الأداء التراكمي (S-Curve): يوزّع ميزانية كل بند خطياً على مدة جدولته
 * المخططة لبناء منحنى "مخطط"، ويجمع الدفعات الفعلية تراكمياً حسب تاريخها لبناء
 * منحنى "فعلي" — على فواصل أسبوعية تغطي كامل مدى المشروع. */
export function computeSCurve(
  activities: Activity[],
  schedule: Schedule,
  budgetEntries: { date: string; amount: number }[]
): SCurvePoint[] {
  const scheduledActivities = activities.filter((a) => schedule[a.id] && getPlannedAmount(a) > 0);
  if (scheduledActivities.length === 0 && budgetEntries.length === 0) return [];

  const allDates: string[] = [
    ...scheduledActivities.flatMap((a) => [schedule[a.id].start, schedule[a.id].end]),
    ...budgetEntries.map((e) => e.date),
  ];
  if (allDates.length === 0) return [];

  const minDate = allDates.reduce((a, b) => (a < b ? a : b));
  const maxDate = allDates.reduce((a, b) => (a > b ? a : b));

  const dates: string[] = [];
  let cursor = minDate;
  while (cursor <= maxDate) {
    dates.push(cursor);
    cursor = addDays(cursor, 7);
  }
  if (dates[dates.length - 1] !== maxDate) dates.push(maxDate);

  return dates.map((date) => {
    let plannedCumulative = 0;
    for (const a of scheduledActivities) {
      const { start, end } = schedule[a.id];
      const amount = getPlannedAmount(a);
      const totalDays = Math.max(1, daysBetween(start, end));
      if (date < start) continue;
      const elapsed = Math.min(totalDays, daysBetween(start, date));
      plannedCumulative += (elapsed / totalDays) * amount;
    }
    const actualCumulative = budgetEntries.filter((e) => e.date <= date).reduce((s, e) => s + e.amount, 0);
    return {
      date,
      label: new Date(date).toLocaleDateString("ar-SA", { day: "2-digit", month: "short" }),
      plannedCumulative: Math.round(plannedCumulative),
      actualCumulative: Math.round(actualCumulative),
    };
  });
}
