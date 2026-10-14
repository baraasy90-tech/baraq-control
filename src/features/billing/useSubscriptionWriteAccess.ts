import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthContext";
import { getSubscriptionAccess } from "./subscriptionAccess";

export function useSubscriptionWriteAccess(companyId: string) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["subscription-policy", user?.id, companyId],
    queryFn: () => getSubscriptionAccess(companyId),
    refetchInterval: 60000,
  });
  return { readOnly: !query.data || query.isError || !query.data.can_write, checking: query.isPending };
}
