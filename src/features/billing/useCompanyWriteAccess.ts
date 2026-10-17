import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthContext";
import { getSubscriptionAccess } from "./subscriptionAccess";

export function useCompanyWriteAccess() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["company-write-access", user?.id],
    queryFn: () => getSubscriptionAccess(),
    enabled: !!user?.id,
    staleTime: 0,
    refetchInterval: 60000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: "always",
  });
  return { readOnly: !query.data || query.isError || !query.data.can_write, checking: query.isPending, unavailable: query.isError };
}
