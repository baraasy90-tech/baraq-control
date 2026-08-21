import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapInternalRequest } from "@/features/requests/api/mapInternalRequest";
import { getFileUrls } from "@/lib/supabase/storage";
import type { InternalRequest, InternalRequestType } from "@/types/domain";

/** طلبات المستخدم الحالي فقط (التي أرسلها بنفسه). */
export function useMyInternalRequests(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-internal-requests", userId],
    enabled: !!userId,
    queryFn: async (): Promise<InternalRequest[]> => {
      const { data, error } = await supabase
        .from("internal_requests")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const urlByStored = await getFileUrls("documents", data.map((row) => row.attachment_url));
      return data.map((row) => {
        const req = mapInternalRequest(row);
        req.attachmentUrl = row.attachment_url ? urlByStored.get(row.attachment_url) ?? null : null;
        return req;
      });
    },
  });
}

/** كل الطلبات التي يسمح للمستخدم الحالي برؤيتها عبر الشركة — تشمل طلباته الخاصة، بالإضافة
 * لأي طلب موجّه إليه شخصياً أو لقسم يرأسه (تُقرَّر تلقائياً عبر RLS، لا فلترة يدوية هنا). */
export function useCompanyInternalRequests(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-internal-requests", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<InternalRequest[]> => {
      const { data, error } = await supabase
        .from("internal_requests")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const urlByStored = await getFileUrls("documents", data.map((row) => row.attachment_url));
      return data.map((row) => {
        const req = mapInternalRequest(row);
        req.attachmentUrl = row.attachment_url ? urlByStored.get(row.attachment_url) ?? null : null;
        return req;
      });
    },
  });
}

export function useCreateInternalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      companyId: string;
      userId: string;
      departmentId: string;
      targetUserId: string | null;
      type: InternalRequestType | null;
      title: string;
      description: string | null;
      startDate: string | null;
      endDate: string | null;
      attachmentUrl: string | null;
    }) => {
      const { error } = await supabase.from("internal_requests").insert({
        company_id: input.companyId,
        user_id: input.userId,
        department_id: input.departmentId,
        target_user_id: input.targetUserId,
        type: input.type,
        title: input.title,
        description: input.description,
        start_date: input.startDate,
        end_date: input.endDate,
        attachment_url: input.attachmentUrl,
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["my-internal-requests", input.userId] });
      queryClient.invalidateQueries({ queryKey: ["company-internal-requests", input.companyId] });
    },
  });
}

export function useReviewInternalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, approve, note }: { requestId: string; approve: boolean; note: string | null }) => {
      const { error } = await supabase.rpc("review_internal_request", {
        p_request_id: requestId,
        p_approve: approve,
        p_note: note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-internal-requests"] });
      queryClient.invalidateQueries({ queryKey: ["company-internal-requests"] });
    },
  });
}
