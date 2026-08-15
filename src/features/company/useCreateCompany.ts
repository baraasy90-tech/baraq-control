import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import type { StorageType } from "@/types/domain";

export interface CreateCompanyInput {
  name: string;
  logoUrl: string | null;
  archiveFolderName: string;
  archiveStorageType: StorageType;
  archiveLocalPath: string | null;
}

export function useCreateCompany() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCompanyInput) => {
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: input.name,
          logo_url: input.logoUrl,
          archive_folder_name: input.archiveFolderName,
          archive_storage_type: input.archiveStorageType,
          archive_local_path: input.archiveLocalPath,
        })
        .select()
        .single();
      if (companyError) throw companyError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ company_id: company.id })
        .eq("id", user!.id);
      if (profileError) throw profileError;

      return company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });
}
