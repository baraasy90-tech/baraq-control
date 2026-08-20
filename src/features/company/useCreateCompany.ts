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
        .rpc("create_company", {
          p_name: input.name,
          p_logo_url: input.logoUrl,
          p_archive_folder_name: input.archiveFolderName,
          p_archive_storage_type: input.archiveStorageType,
          p_archive_local_path: input.archiveLocalPath,
        })
        .single();
      if (companyError) throw companyError;

      return company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });
}
