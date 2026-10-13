import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { CompanyBillingRow, SubscriptionStatus } from "@/types/domain";
import { useAuth } from "@/features/auth/AuthContext";

export function useCompaniesBilling() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["companies-billing", user?.id],
    queryFn: async (): Promise<CompanyBillingRow[]> => {
      const { data, error } = await supabase.rpc("list_all_companies_billing");
      if (error) throw error;
      return data.map((row) => ({
        id: row.id,
        name: row.name,
        subscriptionStatus: row.subscription_status,
        trialEndsAt: row.trial_ends_at,
        subscriptionNote: row.subscription_note,
        subscriptionUpdatedAt: row.subscription_updated_at,
        createdAt: row.created_at,
        memberCount: row.member_count,
        isIndividual: row.is_individual,
      }));
    },
  });
}

export function useSetCompanySubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      companyId: string;
      status: SubscriptionStatus;
      trialEndsAt: string | null;
      note: string | null;
    }) => {
      const { error } = await supabase.rpc("set_company_subscription", {
        p_company_id: input.companyId,
        p_status: input.status,
        p_trial_ends_at: input.trialEndsAt,
        p_note: input.note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies-billing"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-audit"] });
    },
  });
}

export function useSubscriptionAudit(companyId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["subscription-audit", user?.id, companyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_subscription_audit", {p_company_id: companyId});
      if (error) throw error;
      return data;
    },
  });
}
