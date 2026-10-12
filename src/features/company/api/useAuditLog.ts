import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { AuditLogEntry } from "@/types/domain";
import type { Database } from "@/lib/supabase/database.types";

function mapAuditRow(row: Database["public"]["Tables"]["audit_log"]["Row"]): AuditLogEntry {
  return {
    id: row.id,
    companyId: row.company_id,
    projectId: row.project_id,
    tableName: row.table_name,
    recordId: row.record_id,
    action: row.action,
    actorId: row.actor_id,
    oldData: row.old_data && typeof row.old_data === "object" && !Array.isArray(row.old_data) ? row.old_data : null,
    newData: row.new_data && typeof row.new_data === "object" && !Array.isArray(row.new_data) ? row.new_data : null,
    createdAt: row.created_at,
  };
}

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
      return data.map(mapAuditRow);
    },
  });
}

/** سجل التدقيق لسجل واحد بذاته (عقد/طلب مادة/طلب داخلي...) — يُعرض داخل شاشة ذلك
 * السجل نفسه بدل شاشة سجل التدقيق العامة المنفصلة. */
export function useRecordAuditLog(tableName: string, recordId: string | undefined) {
  return useQuery({
    queryKey: ["record-audit-log", tableName, recordId],
    enabled: !!recordId,
    queryFn: async (): Promise<AuditLogEntry[]> => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .eq("table_name", tableName)
        .eq("record_id", recordId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(mapAuditRow);
    },
  });
}
