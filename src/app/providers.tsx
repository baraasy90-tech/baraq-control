import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AuthProvider } from "@/features/auth/AuthContext";

// networkMode الافتراضي "online" (لكل من queries وmutations) هو أساس استمرار
// العمل بدون انقطاع: أي قراءة أو تعديل يُطلَق أثناء انقطاع الشبكة يبقى "متوقفاً
// مؤقتاً" (paused) بدل أن يفشل، ويُستأنف تلقائياً بمجرد عودة الاتصال — لا حاجة
// لأي منطق مزامنة يدوي إضافي هنا؛ OfflineBanner بـ AppShell فقط يوضّح ذلك للمستخدم.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      networkMode: "online",
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
