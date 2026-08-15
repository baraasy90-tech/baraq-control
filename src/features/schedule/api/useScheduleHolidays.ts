import { useQuery } from "@tanstack/react-query";
import { fetchOfficialHolidays } from "@/features/overview/api/useUpcomingHolidays";
import { getIslamicHolidaysInRange } from "@/utils/hijri";
import { getFixedHolidaysInRange } from "@/utils/nationalHolidays";

export interface ScheduleHoliday {
  name: string;
  date: string;
  source: "islamic" | "official";
}

/** يحمّل الأعياد الإسلامية والوطنية (ثابتة يدوياً + خدمة خارجية) الواقعة ضمن مدى تواريخ الجدول الزمني، لتُعرض كخلفية ملوّنة على الأشرطة. */
export function useScheduleHolidays(countryCode: string | undefined, startISO: string | undefined, endISO: string | undefined) {
  return useQuery({
    queryKey: ["schedule-holidays", countryCode, startISO, endISO],
    enabled: !!countryCode && !!startISO && !!endISO,
    staleTime: 1000 * 60 * 60 * 12,
    queryFn: async (): Promise<ScheduleHoliday[]> => {
      const startYear = new Date(startISO!).getFullYear();
      const endYear = new Date(endISO!).getFullYear();
      const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

      const fixed: ScheduleHoliday[] = getFixedHolidaysInRange(countryCode!, startISO!, endISO!).map((h) => ({
        name: h.name,
        date: h.date,
        source: "official" as const,
      }));

      const officialByYear = await Promise.all(years.map((y) => fetchOfficialHolidays(countryCode!, y)));
      const official: ScheduleHoliday[] = officialByYear
        .flat()
        .filter((h) => h.date >= startISO! && h.date <= endISO! && !fixed.some((f) => f.date === h.date))
        .map((h) => ({ name: h.localName, date: h.date, source: "official" as const }));

      const islamic: ScheduleHoliday[] = getIslamicHolidaysInRange(startISO!, endISO!, countryCode).map((h) => ({
        name: h.name,
        date: h.date,
        source: "islamic" as const,
      }));

      return [...fixed, ...official, ...islamic].sort((a, b) => (a.date < b.date ? -1 : 1));
    },
  });
}
