import { useQuery } from "@tanstack/react-query";
import { getUpcomingIslamicHolidays } from "@/utils/hijri";
import { getFixedHolidaysInRange } from "@/utils/nationalHolidays";

export interface UpcomingHoliday {
  name: string;
  date: string;
  source: "islamic" | "official";
}

export interface NagerHoliday {
  date: string;
  localName: string;
}

export async function fetchOfficialHolidays(countryCode: string, year: number): Promise<NagerHoliday[]> {
  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
    if (!res.ok) return [];
    return (await res.json()) as NagerHoliday[];
  } catch {
    return [];
  }
}

const WINDOW_DAYS = 60;

/** أعياد إسلامية (محسوبة محلياً) + أعياد وطنية بتاريخ ثابت (قائمة مُعدّة يدوياً) + أعياد
 * رسمية إضافية من خدمة خارجية مجانية — خلال الفترة القادمة، لعرضها كتنبيهات فقط. */
export function useUpcomingHolidays(countryCode: string | undefined) {
  return useQuery({
    queryKey: ["upcoming-holidays", countryCode],
    enabled: !!countryCode,
    staleTime: 1000 * 60 * 60 * 12,
    queryFn: async (): Promise<UpcomingHoliday[]> => {
      const todayISO = new Date().toISOString().slice(0, 10);
      const todayMs = new Date(todayISO).getTime();
      const horizonISO = new Date(todayMs + WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
      const thisYear = new Date().getFullYear();

      const [thisYearHolidays, nextYearHolidays] = await Promise.all([
        fetchOfficialHolidays(countryCode!, thisYear),
        fetchOfficialHolidays(countryCode!, thisYear + 1),
      ]);

      const fixed: UpcomingHoliday[] = getFixedHolidaysInRange(countryCode!, todayISO, horizonISO).map((h) => ({
        name: h.name,
        date: h.date,
        source: "official" as const,
      }));

      const official: UpcomingHoliday[] = [...thisYearHolidays, ...nextYearHolidays]
        .filter((h) => h.date >= todayISO && h.date <= horizonISO && !fixed.some((f) => f.date === h.date))
        .map((h) => ({ name: h.localName, date: h.date, source: "official" as const }));

      const islamic: UpcomingHoliday[] = getUpcomingIslamicHolidays(WINDOW_DAYS, countryCode).map((h) => ({
        name: h.name,
        date: h.date,
        source: "islamic" as const,
      }));

      return [...fixed, ...official, ...islamic].sort((a, b) => (a.date < b.date ? -1 : 1));
    },
  });
}
