import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { CompanyHoliday } from "@/types/domain";

function mapHoliday(row: {
  id: string;
  company_id: string;
  name: string;
  holiday_date: string;
  recurring_yearly: boolean;
}): CompanyHoliday {
  return { id: row.id, companyId: row.company_id, name: row.name, date: row.holiday_date, recurringYearly: row.recurring_yearly };
}

export function useCompanyHolidays(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-holidays", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<CompanyHoliday[]> => {
      const { data, error } = await supabase
        .from("company_holidays")
        .select("id, company_id, name, holiday_date, recurring_yearly")
        .eq("company_id", companyId!)
        .order("holiday_date");
      if (error) throw error;
      return data.map(mapHoliday);
    },
  });
}

export interface SaveCompanyHolidayInput {
  id?: string;
  companyId: string;
  name: string;
  date: string;
  recurringYearly: boolean;
}

export function useSaveCompanyHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveCompanyHolidayInput) => {
      if (input.id) {
        const { error } = await supabase
          .from("company_holidays")
          .update({ name: input.name, holiday_date: input.date, recurring_yearly: input.recurringYearly })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("company_holidays").insert({
          company_id: input.companyId,
          name: input.name,
          holiday_date: input.date,
          recurring_yearly: input.recurringYearly,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["company-holidays", input.companyId] });
    },
  });
}

/** يحسب مناسبات العطلات المُدخلة يدوياً (متكررة أو لمرة واحدة) الواقعة ضمن مدى تاريخ محدد. */
export function getCompanyHolidaysInRange(holidays: CompanyHoliday[], startISO: string, endISO: string): { name: string; date: string }[] {
  const results: { name: string; date: string }[] = [];
  const startYear = new Date(startISO).getFullYear();
  const endYear = new Date(endISO).getFullYear();

  for (const h of holidays) {
    if (!h.recurringYearly) {
      if (h.date >= startISO && h.date <= endISO) results.push({ name: h.name, date: h.date });
      continue;
    }
    const [, month, day] = h.date.split("-");
    for (let y = startYear; y <= endYear; y++) {
      const date = `${y}-${month}-${day}`;
      if (date >= startISO && date <= endISO) results.push({ name: h.name, date });
    }
  }

  return results.sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function useDeleteCompanyHoliday(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_holidays").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-holidays", companyId] });
    },
  });
}
