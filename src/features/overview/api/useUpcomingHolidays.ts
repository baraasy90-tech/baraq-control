import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { getUpcomingIslamicHolidays } from "@/utils/hijri";
import { getFixedHolidaysInRange } from "@/utils/nationalHolidays";
import { getCompanyHolidaysInRange } from "@/features/company/api/useCompanyHolidays";
import type { CompanyHoliday } from "@/types/domain";

export interface UpcomingHoliday {
  name: string;
  date: string;
  source: "islamic" | "official" | "custom";
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

/** أعياد إسلامية (محسوبة محلياً) + أعياد وطنية بتاريخ ثابت (قائمة مُعدّة يدوياً) + مناسبات
 * الشركة المُدخلة يدوياً + أعياد رسمية إضافية من خدمة خارجية — خلال الفترة القادمة. */
export function useUpcomingHolidays(companyId: string | undefined, countryCode: string | undefined) {
  return useQuery({
    queryKey: ["upcoming-holidays", companyId, countryCode],
    enabled: !!companyId && !!countryCode,
    staleTime: 1000 * 60 * 60 * 12,
    queryFn: async (): Promise<UpcomingHoliday[]> => {
      const todayISO = new Date().toISOString().slice(0, 10);
      const todayMs = new Date(todayISO).getTime();
      const horizonISO = new Date(todayMs + WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
      const thisYear = new Date().getFullYear();

      const [thisYearHolidays, nextYearHolidays, { data: customRows, error: customError }] = await Promise.all([
        fetchOfficialHolidays(countryCode!, thisYear),
        fetchOfficialHolidays(countryCode!, thisYear + 1),
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
      const custom: UpcomingHoliday[] = getCompanyHolidaysInRange(customHolidays, todayISO, horizonISO).map((h) => ({
        name: h.name,
        date: h.date,
        source: "custom" as const,
      }));

      const fixed: UpcomingHoliday[] = getFixedHolidaysInRange(countryCode!, todayISO, horizonISO)
        .filter((h) => !custom.some((c) => c.date === h.date))
        .map((h) => ({ name: h.name, date: h.date, source: "official" as const }));

      const official: UpcomingHoliday[] = [...thisYearHolidays, ...nextYearHolidays]
        .filter(
          (h) =>
            h.date >= todayISO &&
            h.date <= horizonISO &&
            !fixed.some((f) => f.date === h.date) &&
            !custom.some((c) => c.date === h.date)
        )
        .map((h) => ({ name: h.localName, date: h.date, source: "official" as const }));

      const islamic: UpcomingHoliday[] = getUpcomingIslamicHolidays(WINDOW_DAYS, countryCode).map((h) => ({
        name: h.name,
        date: h.date,
        source: "islamic" as const,
      }));

      return [...custom, ...fixed, ...official, ...islamic].sort((a, b) => (a.date < b.date ? -1 : 1));
    },
  });
}
