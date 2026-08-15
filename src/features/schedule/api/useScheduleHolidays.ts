import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { fetchOfficialHolidays } from "@/features/overview/api/useUpcomingHolidays";
import { getIslamicHolidaysInRange } from "@/utils/hijri";
import { getFixedHolidaysInRange } from "@/utils/nationalHolidays";
import { getCompanyHolidaysInRange } from "@/features/company/api/useCompanyHolidays";
import type { CompanyHoliday } from "@/types/domain";

export interface ScheduleHoliday {
  name: string;
  date: string;
  source: "islamic" | "official" | "custom";
}

/** يحمّل الأعياد الإسلامية والوطنية (ثابتة يدوياً + مناسبات الشركة + خدمة خارجية) الواقعة
 * ضمن مدى تواريخ الجدول الزمني، لتُعرض كخلفية ملوّنة على الأشرطة. */
export function useScheduleHolidays(
  companyId: string | undefined,
  countryCode: string | undefined,
  startISO: string | undefined,
  endISO: string | undefined
) {
  return useQuery({
    queryKey: ["schedule-holidays", companyId, countryCode, startISO, endISO],
    enabled: !!companyId && !!countryCode && !!startISO && !!endISO,
    staleTime: 1000 * 60 * 60 * 12,
    queryFn: async (): Promise<ScheduleHoliday[]> => {
      const startYear = new Date(startISO!).getFullYear();
      const endYear = new Date(endISO!).getFullYear();
      const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

      const [officialByYear, { data: customRows, error: customError }] = await Promise.all([
        Promise.all(years.map((y) => fetchOfficialHolidays(countryCode!, y))),
        supabase
          .from("company_holidays")
          .select("id, company_id, name, holiday_date, recurring_yearly")
          .eq("company_id", companyId!),
      ]);
      if (customError) throw customError;

      const customHolidays: CompanyHoliday[] = customRows.map((r) => ({
        id: r.id,
        companyId: r.company_id,
        name: r.name,
        date: r.holiday_date,
        recurringYearly: r.recurring_yearly,
      }));
      const custom: ScheduleHoliday[] = getCompanyHolidaysInRange(customHolidays, startISO!, endISO!).map((h) => ({
        name: h.name,
        date: h.date,
        source: "custom" as const,
      }));

      const fixed: ScheduleHoliday[] = getFixedHolidaysInRange(countryCode!, startISO!, endISO!)
        .filter((h) => !custom.some((c) => c.date === h.date))
        .map((h) => ({ name: h.name, date: h.date, source: "official" as const }));

      const official: ScheduleHoliday[] = officialByYear
        .flat()
        .filter(
          (h) =>
            h.date >= startISO! &&
            h.date <= endISO! &&
            !fixed.some((f) => f.date === h.date) &&
            !custom.some((c) => c.date === h.date)
        )
        .map((h) => ({ name: h.localName, date: h.date, source: "official" as const }));

      const islamic: ScheduleHoliday[] = getIslamicHolidaysInRange(startISO!, endISO!, countryCode).map((h) => ({
        name: h.name,
        date: h.date,
        source: "islamic" as const,
      }));

      return [...custom, ...fixed, ...official, ...islamic].sort((a, b) => (a.date < b.date ? -1 : 1));
    },
  });
}
