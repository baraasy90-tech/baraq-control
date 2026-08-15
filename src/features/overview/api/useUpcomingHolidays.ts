import { useQuery } from "@tanstack/react-query";
import { getUpcomingIslamicHolidays } from "@/utils/hijri";

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

/** أعياد إسلامية (محسوبة محلياً) + أعياد رسمية لدولة الشركة (من خدمة خارجية مجانية)
 * خلال الفترة القادمة — لعرضها كتنبيهات فقط، بدون أي تأثير على حسابات الجدولة. */
export function useUpcomingHolidays(countryCode: string | undefined) {
  return useQuery({
    queryKey: ["upcoming-holidays", countryCode],
    enabled: !!countryCode,
    staleTime: 1000 * 60 * 60 * 12,
    queryFn: async (): Promise<UpcomingHoliday[]> => {
      const todayISO = new Date().toISOString().slice(0, 10);
      const todayMs = new Date(todayISO).getTime();
      const horizonMs = todayMs + WINDOW_DAYS * 86400000;
      const thisYear = new Date().getFullYear();

      const [thisYearHolidays, nextYearHolidays] = await Promise.all([
        fetchOfficialHolidays(countryCode!, thisYear),
        fetchOfficialHolidays(countryCode!, thisYear + 1),
      ]);

      const official: UpcomingHoliday[] = [...thisYearHolidays, ...nextYearHolidays]
        .filter((h) => {
          const ms = new Date(h.date).getTime();
          return ms >= todayMs && ms <= horizonMs;
        })
        .map((h) => ({ name: h.localName, date: h.date, source: "official" as const }));

      const islamic: UpcomingHoliday[] = getUpcomingIslamicHolidays(WINDOW_DAYS).map((h) => ({
        name: h.name,
        date: h.date,
        source: "islamic" as const,
      }));

      return [...official, ...islamic].sort((a, b) => (a.date < b.date ? -1 : 1));
    },
  });
}
