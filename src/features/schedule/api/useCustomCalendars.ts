import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { CustomCalendar } from "@/types/domain";

function mapCalendar(row: { id: string; company_id: string; name: string; working_weekdays: number[] }): CustomCalendar {
  return { id: row.id, companyId: row.company_id, name: row.name, workingWeekdays: row.working_weekdays };
}

export function useCustomCalendars(companyId: string | undefined) {
  return useQuery({
    queryKey: ["custom-calendars", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<CustomCalendar[]> => {
      const { data, error } = await supabase
        .from("custom_calendars")
        .select("id, company_id, name, working_weekdays")
        .eq("company_id", companyId!)
        .order("name");
      if (error) throw error;
      return data.map(mapCalendar);
    },
  });
}

/** خريطة جاهزة id → أيام العمل، مناسبة للتمرير مباشرة إلى computeSchedule. */
export function useCustomCalendarMap(companyId: string | undefined): Map<string, number[]> {
  const query = useCustomCalendars(companyId);
  return new Map((query.data ?? []).map((c) => [c.id, c.workingWeekdays]));
}

export interface SaveCustomCalendarInput {
  id?: string;
  companyId: string;
  name: string;
  workingWeekdays: number[];
}

export function useSaveCustomCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveCustomCalendarInput) => {
      if (input.id) {
        const { error } = await supabase
          .from("custom_calendars")
          .update({ name: input.name, working_weekdays: input.workingWeekdays })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("custom_calendars")
          .insert({ company_id: input.companyId, name: input.name, working_weekdays: input.workingWeekdays });
        if (error) throw error;
      }
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["custom-calendars", input.companyId] });
    },
  });
}

export function useDeleteCustomCalendar(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custom_calendars").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-calendars", companyId] });
    },
  });
}
