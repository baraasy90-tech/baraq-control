import type { CalendarType } from "@/types/domain";

/** Calendar date in the user's local timezone, without converting to UTC. */
export const todayISO = (): string => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
};

export const addDays = (iso: string, d: number): string => {
  const dt = new Date(iso);
  dt.setUTCDate(dt.getUTCDate() + d);
  return dt.toISOString().slice(0, 10);
};

export const fmt = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleDateString("ar-SA", { day: "2-digit", month: "short" }) : "—";

/** بداية الأسبوع (الأحد) للتاريخ المُعطى، كـ ISO date. */
export function startOfWeek(iso: string): string {
  const dt = new Date(iso);
  dt.setUTCDate(dt.getUTCDate() - dt.getUTCDay());
  return dt.toISOString().slice(0, 10);
}

/**
 * حساب تاريخ النهاية حسب نوع التقويم:
 * - "calendar": كل أيام الأسبوع السبعة
 * - "workdays": ٦ أيام فقط، الجمعة إجازة (Friday = 5 بترقيم JS Sun=0..Sat=6)
 * - تقويم مخصص (customWorkingWeekdays): إن مُرِّر، يتجاوز calendarType تماماً ويُحسب
 *   فقط الأيام اللي رقمها موجود بالمصفوفة (Sun=0..Sat=6) كأيام عمل فعلية.
 */
export function addByCalendar(
  startISO: string | null,
  days: number,
  calendarType: CalendarType,
  customWorkingWeekdays?: number[] | null
): string | null {
  if (!startISO || !days || days <= 0) return startISO;
  if (customWorkingWeekdays && customWorkingWeekdays.length > 0) {
    const date = new Date(startISO);
    let count = 0;
    while (count < days) {
      date.setUTCDate(date.getUTCDate() + 1);
      if (customWorkingWeekdays.includes(date.getUTCDay())) count++;
    }
    return date.toISOString().slice(0, 10);
  }
  if (calendarType !== "workdays") return addDays(startISO, days);
  const date = new Date(startISO);
  let count = 0;
  while (count < days) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (date.getUTCDay() !== 5) count++;
  }
  return date.toISOString().slice(0, 10);
}

export const CALENDAR_LABEL: Record<CalendarType, string> = {
  calendar: "تقويم عادي (٧ أيام)",
  workdays: "أيام عمل (٦ أيام، الجمعة إجازة)",
};
