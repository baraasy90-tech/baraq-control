import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapHrRequest } from "@/features/hr/api/mapHrRequest";
import type { HrRequest, HrRequestType } from "@/types/domain";

/** طلبات المستخدم الحالي فقط — شخصية، غير مرتبطة بأي مشروع. */
export function useMyHrRequests(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-hr-requests", userId],
    enabled: !!userId,
    queryFn: async (): Promise<HrRequest[]> => {
      const { data, error } = await supabase
        .from("hr_requests")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(mapHrRequest);
    },
  });
}

/** كل طلبات الموارد البشرية بالشركة — لصندوق وارد رئيس قسم HR (أو مدير الحساب/التنفيذية). */
export function useCompanyHrRequests(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-hr-requests", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<HrRequest[]> => {
      const { data, error } = await supabase
        .from("hr_requests")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(mapHrRequest);
    },
  });
}

export function useCreateHrRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      companyId: string;
      userId: string;
      type: HrRequestType;
      title: string;
      description: string | null;
      startDate: string | null;
      endDate: string | null;
    }) => {
      const { error } = await supabase.from("hr_requests").insert({
        company_id: input.companyId,
        user_id: input.userId,
        type: input.type,
        title: input.title,
        description: input.description,
        start_date: input.startDate,
        end_date: input.endDate,
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["my-hr-requests", input.userId] });
      queryClient.invalidateQueries({ queryKey: ["company-hr-requests", input.companyId] });
    },
  });
}

export function useReviewHrRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, approve, note }: { requestId: string; approve: boolean; note: string | null }) => {
      const { error } = await supabase.rpc("review_hr_request", { p_request_id: requestId, p_approve: approve, p_note: note });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-hr-requests"] });
      queryClient.invalidateQueries({ queryKey: ["company-hr-requests"] });
    },
  });
}
