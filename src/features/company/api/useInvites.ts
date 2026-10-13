import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import type { Invite } from "@/types/domain";

export function useInvites(companyId: string | undefined) {
  return useQuery({
    queryKey: ["invites", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<Invite[]> => {
      const data = await fetchAllRows((from, to) => supabase
        .from("invites")
        .select("id, company_id, department_id, role, email, token, status, created_at, expires_at")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false }).order("id").range(from, to));
      return data.map((i) => ({
        id: i.id,
        companyId: i.company_id,
        departmentId: i.department_id,
        role: i.role,
        email: i.email,
        token: i.token,
        status: i.status,
        createdAt: i.created_at,
        expiresAt: i.expires_at,
      }));
    },
  });
}
