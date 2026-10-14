import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthContext";
import { getSubscriptionAccess } from "./subscriptionAccess";

export function useSubscriptionWriteAccess(projectId: string) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["project-subscription-policy", user?.id, projectId],
    queryFn: () => getSubscriptionAccess(undefined, projectId),
    enabled: !!user?.id && !!projectId,
    staleTime: 0,
    refetchInterval: 60000,
  });
  return { readOnly: !query.data || query.isError || !query.data.can_write, checking: query.isPending, unavailable: query.isError };
}
