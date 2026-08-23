import type { Database } from "@/lib/supabase/database.types";
import type { Project, ScopeConfig } from "@/types/domain";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

export function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    companyId: row.company_id,
    departmentId: row.department_id,
    procurementDepartmentId: row.procurement_department_id,
    name: row.name,
    managerName: row.manager_name,
    location: row.location,
    mapLink: row.map_link,
    area: row.area,
    unitsCount: row.units_count,
    projectType: row.project_type,
    managerSignatureUrl: row.manager_signature_url,
    themeColor: row.theme_color,
    themeIcon: row.theme_icon,
    scopeConfig: (row.scope_config as unknown as ScopeConfig) ?? null,
    status: row.status,
    createdAt: row.created_at,
  };
}
