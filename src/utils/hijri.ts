/**
 * تحويل تقويم هجري ↔ ميلادي بالحساب الفلكي التقريبي (خوارزمية شائعة قائمة على
 * يوم جوليان). دقتها عادة يوم واحد مقارنة بإعلانات رؤية الهلال الرسمية (كالتقويم
 * السعودي أم القرى) — مناسبة لتنبيهات تقريبية، وليست بديلاً عن إعلان رسمي.
 */

const HIJRI_EPOCH_JDN = 1948440;

function hijriToJDN(year: number, month: number, day: number): number {
  return day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30) + HIJRI_EPOCH_JDN - 1;
}

function jdnToGregorian(jdn: number): { year: number; month: number; day: number } {
  let l = jdn + 68569;
  const n = Math.floor((4 * l) / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l) / 2447);
  const day = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  const month = j + 2 - 12 * l;
  const year = 100 * (n - 49) + i + l;
  return { year, month, day };
}

function gregorianToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function jdnToHijri(jdn: number): { year: number; month: number; day: number } {
  const l1 = jdn - HIJRI_EPOCH_JDN + 10632;
  const n = Math.floor((l1 - 1) / 10631);
  const l2 = l1 - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l3) / 709);
  const day = l3 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { year, month, day };
}

/** يعيد تاريخ ميلادي (YYYY-MM-DD) لتاريخ هجري محدد. */
export function hijriToGregorianISO(hijriYear: number, hijriMonth: number, hijriDay: number): string {
  const { year, month, day } = jdnToGregorian(hijriToJDN(hijriYear, hijriMonth, hijriDay));
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

/** السنة الهجرية المقابلة لتاريخ ميلادي معيّن. */
export function gregorianToHijriYear(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return jdnToHijri(gregorianToJDN(y, m, d)).year;
}

export interface IslamicOccasion {
  name: string;
  hijriMonth: number;
  hijriDay: number;
}

export const ISLAMIC_OCCASIONS: IslamicOccasion[] = [
  { name: "رأس السنة الهجرية", hijriMonth: 1, hijriDay: 1 },
  { name: "المولد النبوي", hijriMonth: 3, hijriDay: 12 },
  { name: "بداية شهر رمضان", hijriMonth: 9, hijriDay: 1 },
  { name: "ليلة القدر (تقريبية)", hijriMonth: 9, hijriDay: 27 },
  { name: "عيد الفطر", hijriMonth: 10, hijriDay: 1 },
  { name: "يوم عرفة", hijriMonth: 12, hijriDay: 9 },
  { name: "عيد الأضحى", hijriMonth: 12, hijriDay: 10 },
];

export interface UpcomingIslamicHoliday {
  name: string;
  date: string;
}

/** يحسب كل المناسبات الإسلامية الواقعة بين اليوم وحتى windowDays يوماً قادمة. */
export function getUpcomingIslamicHolidays(windowDays = 60): UpcomingIslamicHoliday[] {
  const todayISO = new Date().toISOString().slice(0, 10);
  const currentHijriYear = gregorianToHijriYear(todayISO);
  const results: UpcomingIslamicHoliday[] = [];
  const todayMs = new Date(todayISO).getTime();
  const horizonMs = todayMs + windowDays * 86400000;

  for (const hy of [currentHijriYear, currentHijriYear + 1]) {
    for (const occ of ISLAMIC_OCCASIONS) {
      const date = hijriToGregorianISO(hy, occ.hijriMonth, occ.hijriDay);
      const ms = new Date(date).getTime();
      if (ms >= todayMs && ms <= horizonMs) {
        results.push({ name: occ.name, date });
      }
    }
  }

  return results.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** يحسب كل المناسبات الإسلامية الواقعة ضمن مدى تاريخ ميلادي محدد (بدايته ونهايته). */
export function getIslamicHolidaysInRange(startISO: string, endISO: string): UpcomingIslamicHoliday[] {
  const startMs = new Date(startISO).getTime();
  const endMs = new Date(endISO).getTime();
  const startHijriYear = gregorianToHijriYear(startISO);
  const endHijriYear = gregorianToHijriYear(endISO);
  const results: UpcomingIslamicHoliday[] = [];

  for (let hy = startHijriYear; hy <= endHijriYear + 1; hy++) {
    for (const occ of ISLAMIC_OCCASIONS) {
      const date = hijriToGregorianISO(hy, occ.hijriMonth, occ.hijriDay);
      const ms = new Date(date).getTime();
      if (ms >= startMs && ms <= endMs) {
        results.push({ name: occ.name, date });
      }
    }
  }

  return results.sort((a, b) => (a.date < b.date ? -1 : 1));
}
