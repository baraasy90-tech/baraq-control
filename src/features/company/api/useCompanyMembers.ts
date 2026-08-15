import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export interface CompanyMember {
  id: string;
  fullName: string;
}

export function useCompanyMembers(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company_members", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<CompanyMember[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("company_id", companyId!)
        .order("full_name");
      if (error) throw error;
      return data.map((p) => ({ id: p.id, fullName: p.full_name || "بدون اسم" }));
    },
  });
}
