import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapInternalRequest } from "@/features/requests/api/mapInternalRequest";
import type { ApprovalChainStepInput, ApprovalChainType, InternalRequest, InternalRequestType } from "@/types/domain";

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
      return data.map(mapInternalRequest);
    },
  });
}

/** كل الطلبات التي يسمح للمستخدم الحالي برؤيتها عبر الشركة — تشمل طلباته الخاصة، بالإضافة
 * لأي طلب فيه خطوة اعتماد موجّهة إليه شخصياً أو لقسم يرأسه (تُقرَّر تلقائياً عبر RLS). */
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
      return data.map(mapInternalRequest);
    },
  });
}

function toStepsJson(steps: ApprovalChainStepInput[]) {
  return steps.map((s) => ({ department_id: s.departmentId, user_id: s.userId }));
}

export function useCreateInternalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      type: InternalRequestType | null;
      title: string;
      description: string | null;
      startDate: string | null;
      endDate: string | null;
      chainType: ApprovalChainType;
      steps: ApprovalChainStepInput[];
      note: string | null;
      templateId: string | null;
    }) => {
      const { data, error } = await supabase.rpc("create_internal_request", {
        p_type: input.type,
        p_title: input.title,
        p_description: input.description,
        p_start_date: input.startDate,
        p_end_date: input.endDate,
        p_chain_type: input.chainType,
        p_steps: input.templateId ? null : toStepsJson(input.steps),
        p_note: input.note,
        p_template_id: input.templateId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-internal-requests"] });
      queryClient.invalidateQueries({ queryKey: ["company-internal-requests"] });
    },
  });
}
