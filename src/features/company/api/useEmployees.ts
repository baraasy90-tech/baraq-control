import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Employee, EmployeeStatus } from "@/types/domain";

function mapEmployee(row: {
  id: string;
  company_id: string;
  department_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  organizational_level_id: string | null;
  organizational_classification_id: string | null;
  job_title_id: string | null;
  direct_manager_employee_id: string | null;
  status: EmployeeStatus;
}): Employee {
  return {
    id: row.id,
    companyId: row.company_id,
    departmentId: row.department_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    userId: row.user_id,
    organizationalLevelId: row.organizational_level_id,
    organizationalClassificationId: row.organizational_classification_id,
    jobTitleId: row.job_title_id,
    directManagerEmployeeId: row.direct_manager_employee_id,
    status: row.status,
  };
}

export function useEmployees(companyId: string | undefined) {
  return useQuery({
    queryKey: ["employees", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<Employee[]> => {
      const { data, error } = await supabase
        .from("employees")
        .select(
          "id, company_id, department_id, full_name, email, phone, user_id, organizational_level_id, organizational_classification_id, job_title_id, direct_manager_employee_id, status"
        )
        .eq("company_id", companyId!)
        .order("full_name");
      if (error) throw error;
      return data.map(mapEmployee);
    },
  });
}

export interface SaveEmployeeInput {
  id?: string;
  companyId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  departmentId: string | null;
  organizationalLevelId: string | null;
  organizationalClassificationId: string | null;
  jobTitleId: string | null;
  directManagerEmployeeId: string | null;
  status: EmployeeStatus;
}

export function useSaveEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveEmployeeInput) => {
      const row = {
        company_id: input.companyId,
        full_name: input.fullName,
        email: input.email,
        phone: input.phone,
        department_id: input.departmentId,
        organizational_level_id: input.organizationalLevelId,
        organizational_classification_id: input.organizationalClassificationId,
        job_title_id: input.jobTitleId,
        direct_manager_employee_id: input.directManagerEmployeeId,
        status: input.status,
      };
      const { error } = input.id
        ? await supabase.from("employees").update(row).eq("id", input.id)
        : await supabase.from("employees").insert(row);
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["employees", input.companyId] });
    },
  });
}

export function useDeleteEmployee(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", companyId] });
    },
  });
}
