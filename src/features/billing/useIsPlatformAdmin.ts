import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

export function useIsPlatformAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-platform-admin", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc("is_platform_admin");
      if (error) throw error;
      return data ?? false;
    },
  });
}
