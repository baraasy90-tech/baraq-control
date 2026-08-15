/**
 * أعياد وطنية رسمية بتاريخ ميلادي ثابت لكل دولة — قائمة مُعدّة يدوياً (وليست من خدمة
 * خارجية) لأن أغلب خدمات الأعياد المجانية لا تغطي دول الخليج بشكل موثوق. تشمل فقط
 * الأعياد ذات التاريخ الثابت المعروف؛ الأعياد المرتبطة بالتقويم الهجري (كعيدي الفطر
 * والأضحى) تُحسب بشكل منفصل عبر hijri.ts وتنطبق على كل الدول الإسلامية بالقائمة.
 */

export interface FixedHoliday {
  name: string;
  month: number;
  day: number;
}

export const FIXED_NATIONAL_HOLIDAYS: Record<string, FixedHoliday[]> = {
  SA: [
    { name: "يوم التأسيس", month: 2, day: 22 },
    { name: "اليوم الوطني السعودي", month: 9, day: 23 },
  ],
  AE: [
    { name: "رأس السنة الميلادية", month: 1, day: 1 },
    { name: "يوم الشهيد", month: 12, day: 1 },
    { name: "اليوم الوطني الإماراتي", month: 12, day: 2 },
    { name: "اليوم الوطني الإماراتي (اليوم الثاني)", month: 12, day: 3 },
  ],
  EG: [
    { name: "عيد الثورة", month: 1, day: 25 },
    { name: "عيد تحرير سيناء", month: 4, day: 25 },
    { name: "عيد العمال", month: 5, day: 1 },
    { name: "ثورة 30 يونيو", month: 6, day: 30 },
    { name: "عيد القوات المسلحة", month: 10, day: 6 },
  ],
  JO: [
    { name: "عيد العمال", month: 5, day: 1 },
    { name: "عيد الاستقلال", month: 5, day: 25 },
    { name: "عيد الميلاد المجيد", month: 12, day: 25 },
  ],
  KW: [
    { name: "العيد الوطني الكويتي", month: 2, day: 25 },
    { name: "عيد التحرير", month: 2, day: 26 },
  ],
  QA: [{ name: "اليوم الوطني القطري", month: 12, day: 18 }],
  BH: [
    { name: "عيد العمال", month: 5, day: 1 },
    { name: "اليوم الوطني البحريني", month: 12, day: 16 },
    { name: "اليوم الوطني البحريني (اليوم الثاني)", month: 12, day: 17 },
  ],
  OM: [
    { name: "عيد النهضة", month: 7, day: 23 },
    { name: "العيد الوطني العماني", month: 11, day: 18 },
  ],
  IQ: [{ name: "عيد الجمهورية", month: 7, day: 14 }],
  MA: [
    { name: "ذكرى تقديم وثيقة الاستقلال", month: 1, day: 11 },
    { name: "عيد الشغل", month: 5, day: 1 },
    { name: "عيد العرش", month: 7, day: 30 },
    { name: "ذكرى المسيرة الخضراء", month: 11, day: 6 },
    { name: "عيد الاستقلال", month: 11, day: 18 },
  ],
  TN: [
    { name: "عيد الثورة", month: 1, day: 14 },
    { name: "عيد الاستقلال", month: 3, day: 20 },
    { name: "عيد الشهداء", month: 4, day: 9 },
    { name: "عيد العمال", month: 5, day: 1 },
    { name: "عيد الجمهورية", month: 7, day: 25 },
  ],
  DZ: [
    { name: "عيد العمال", month: 5, day: 1 },
    { name: "عيد الاستقلال", month: 7, day: 5 },
    { name: "عيد الثورة", month: 11, day: 1 },
  ],
  LB: [
    { name: "عيد الاستقلال", month: 11, day: 22 },
    { name: "عيد الميلاد المجيد", month: 12, day: 25 },
  ],
  US: [
    { name: "New Year's Day", month: 1, day: 1 },
    { name: "Independence Day", month: 7, day: 4 },
    { name: "Christmas Day", month: 12, day: 25 },
  ],
  GB: [
    { name: "New Year's Day", month: 1, day: 1 },
    { name: "Christmas Day", month: 12, day: 25 },
  ],
};

export interface FixedHolidayOccurrence {
  name: string;
  date: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** يحسب مناسبات الأعياد الوطنية ذات التاريخ الثابت الواقعة ضمن مدى تاريخ ميلادي محدد. */
export function getFixedHolidaysInRange(countryCode: string, startISO: string, endISO: string): FixedHolidayOccurrence[] {
  const holidays = FIXED_NATIONAL_HOLIDAYS[countryCode];
  if (!holidays || holidays.length === 0) return [];

  const startYear = new Date(startISO).getFullYear();
  const endYear = new Date(endISO).getFullYear();
  const results: FixedHolidayOccurrence[] = [];

  for (let y = startYear; y <= endYear; y++) {
    for (const h of holidays) {
      const date = `${y}-${pad(h.month)}-${pad(h.day)}`;
      if (date >= startISO && date <= endISO) {
        results.push({ name: h.name, date });
      }
    }
  }

  return results.sort((a, b) => (a.date < b.date ? -1 : 1));
}
