import type { Activity, Schedule } from "@/types/domain";
import { getPlannedAmount } from "@/features/budget/lib/budget";

export interface SCurvePoint {
  date: string;
  label: string;
  plannedCumulative: number;
  actualCumulative: number;
}

interface PlannedWindow {
  start: string;
  end: string;
  amount: number;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function plannedAtDate(date: string, windows: PlannedWindow[]): number {
  let total = 0;
  for (const w of windows) {
    const totalDays = Math.max(1, daysBetween(w.start, w.end));
    if (date < w.start) continue;
    const elapsed = Math.min(totalDays, daysBetween(w.start, date));
    total += (elapsed / totalDays) * w.amount;
  }
  return total;
}

function buildCurve(windows: PlannedWindow[], budgetEntries: { date: string; amount: number }[]): SCurvePoint[] {
  const allDates: string[] = [...windows.flatMap((w) => [w.start, w.end]), ...budgetEntries.map((e) => e.date)];
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

  return dates.map((date) => ({
    date,
    label: new Date(date).toLocaleDateString("ar-SA", { day: "2-digit", month: "short" }),
    plannedCumulative: Math.round(plannedAtDate(date, windows)),
    actualCumulative: Math.round(budgetEntries.filter((e) => e.date <= date).reduce((s, e) => s + e.amount, 0)),
  }));
}

/** منحنى الأداء التراكمي — الخيار "التفصيلي": يوزّع ميزانية كل بند خطياً على مدة
 * جدولته الخاصة، ويجمع النتائج — أدق لأنه يعكس متى يُصرف كل بند فعلياً حسب موقعه
 * بالجدول الزمني، لكنه يتطلب إدخال ميزانية لكل بند مسبقاً. */
export function computeSCurve(
  activities: Activity[],
  schedule: Schedule,
  budgetEntries: { date: string; amount: number }[]
): SCurvePoint[] {
  const windows: PlannedWindow[] = activities
    .filter((a) => schedule[a.id] && getPlannedAmount(a) > 0)
    .map((a) => ({ start: schedule[a.id].start, end: schedule[a.id].end, amount: getPlannedAmount(a) }));
  return buildCurve(windows, budgetEntries);
}

/** منحنى الأداء التراكمي — الخيار "التلقائي": يوزّع قيمة العقد الإجمالية خطياً على
 * كامل مدة الجدول الزمني (من أول بداية بند لآخر نهاية بند) كخط واحد، دون الحاجة لأي
 * إدخال ميزانية لكل بند — أقل دقة لكنه يعمل فوراً. */
export function computeSCurveFromTotal(
  totalValue: number,
  activities: Activity[],
  schedule: Schedule,
  budgetEntries: { date: string; amount: number }[]
): SCurvePoint[] {
  const scheduled = activities.filter((a) => schedule[a.id]);
  if (scheduled.length === 0 || totalValue <= 0) return [];
  const starts = scheduled.map((a) => schedule[a.id].start);
  const ends = scheduled.map((a) => schedule[a.id].end);
  const projectStart = starts.reduce((a, b) => (a < b ? a : b));
  const projectEnd = ends.reduce((a, b) => (a > b ? a : b));
  return buildCurve([{ start: projectStart, end: projectEnd, amount: totalValue }], budgetEntries);
}
