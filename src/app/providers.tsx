import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext";
import { createSessionQueryClient } from "@/lib/sessionQueryClient";

function SessionQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createSessionQueryClient);
  useEffect(() => () => {
    void client.cancelQueries();
    client.clear();
  }, [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function SessionQueries({ children }: { children: ReactNode }) {
  const { user, loading, cacheEpoch } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-ink-soft">جارٍ التحميل...</div>;
  return <SessionQueryProvider key={(user?.id ?? "signed-out") + ":" + cacheEpoch}>{children}</SessionQueryProvider>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider><SessionQueries>{children}</SessionQueries></AuthProvider>
  );
}
