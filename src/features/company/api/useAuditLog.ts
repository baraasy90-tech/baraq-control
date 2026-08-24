import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { AuditLogEntry } from "@/types/domain";

function mapAuditRow(row: {
  id: string;
  company_id: string;
  project_id: string | null;
  table_name: string;
  record_id: string;
  action: "insert" | "update" | "delete";
  actor_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}): AuditLogEntry {
  return {
    id: row.id,
    companyId: row.company_id,
    projectId: row.project_id,
    tableName: row.table_name,
    recordId: row.record_id,
    action: row.action,
    actorId: row.actor_id,
    oldData: row.old_data,
    newData: row.new_data,
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
