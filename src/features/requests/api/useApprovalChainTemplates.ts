import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import {
  mapApprovalChainTemplate,
  mapApprovalChainTemplateStep,
} from "@/features/requests/api/mapInternalRequest";
import type { ApprovalChainStepInput, ApprovalChainTemplate, ApprovalChainTemplateStep, ApprovalChainType } from "@/types/domain";

export interface ApprovalChainTemplateBundle {
  template: ApprovalChainTemplate;
  steps: ApprovalChainTemplateStep[];
}

/** قوالب سلاسل الاعتماد القابلة لإعادة الاستخدام بالشركة (تصلح لأي نوع طلب مستقبلاً). */
export function useApprovalChainTemplates(companyId: string | undefined) {
  return useQuery({
    queryKey: ["approval-chain-templates", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<ApprovalChainTemplateBundle[]> => {
      const { data: templateRows, error } = await supabase
        .from("approval_chain_templates")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (templateRows.length === 0) return [];

      const templateIds = templateRows.map((t) => t.id);
      const { data: stepRows, error: stepsError } = await supabase
        .from("approval_chain_template_steps")
        .select("*")
        .in("template_id", templateIds)
        .order("step_order", { ascending: true });
      if (stepsError) throw stepsError;

      return templateRows.map(mapApprovalChainTemplate).map((template) => ({
        template,
        steps: stepRows.filter((s) => s.template_id === template.id).map(mapApprovalChainTemplateStep),
      }));
    },
  });
}

export function useCreateApprovalChainTemplate(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, chainType, steps }: { name: string; chainType: ApprovalChainType; steps: ApprovalChainStepInput[] }) => {
      const { error } = await supabase.rpc("create_approval_chain_template", {
        p_name: name,
        p_chain_type: chainType,
        p_steps: steps.map((s) => ({ department_id: s.departmentId, user_id: s.userId })),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-chain-templates", companyId] });
    },
  });
}

export function useDeleteApprovalChainTemplate(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase.rpc("delete_approval_chain_template", { p_template_id: templateId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-chain-templates", companyId] });
    },
  });
}
