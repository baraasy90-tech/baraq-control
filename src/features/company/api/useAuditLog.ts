import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { AuditLogEntry } from "@/types/domain";

export function useAuditLog(companyId: string | undefined) {
  return useQuery({
    queryKey: ["audit-log", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<AuditLogEntry[]> => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data.map((row) => ({
        id: row.id,
        companyId: row.company_id,
        tableName: row.table_name,
        recordId: row.record_id,
        action: row.action,
        actorId: row.actor_id,
        oldData: row.old_data,
        newData: row.new_data,
        createdAt: row.created_at,
      }));
    },
  });
}
