import { MutationCache, onlineManager, QueryClient } from "@tanstack/react-query";

/** A separate cache per signed-in identity, including pending mutations. */
export function createSessionQueryClient() {
  const client = new QueryClient({
    mutationCache: new MutationCache({
      onMutate: () => {
        if (!onlineManager.isOnline()) {
          throw new Error("لا يوجد اتصال بالإنترنت. احتفظ بالصفحة مفتوحة وأعد الحفظ بعد عودة الاتصال.");
        }
      },
      onSuccess: () => {
        // Aggregates span several tables; refresh them after any successful write.
        void client.invalidateQueries({ queryKey: ["overview"] });
        void client.invalidateQueries({ queryKey: ["schedule-tasks"] });
        void client.invalidateQueries({ queryKey: ["company-approvals"] });
      },
    }),
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 2, refetchOnReconnect: true },
      // Retrying a write after an ambiguous network error can duplicate it.
      mutations: { retry: false, networkMode: "always" },
    },
  });
  return client;
}
