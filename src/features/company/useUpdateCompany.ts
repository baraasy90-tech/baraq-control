import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import type { Database } from "@/lib/supabase/database.types";
import type { PrintMode, StorageType } from "@/types/domain";

type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];

export interface UpdateCompanyInput {
  id: string;
  name?: string;
  logoUrl?: string | null;
  archiveFolderName?: string;
  archiveStorageType?: StorageType;
  archiveLocalPath?: string | null;
  printMode?: PrintMode;
  printHeaderUrl?: string | null;
  printFooterUrl?: string | null;
  printFullPageUrl?: string | null;
  printMarginTop?: number;
  printMarginBottom?: number;
  printMarginLeft?: number;
  printMarginRight?: number;
  headerColor?: string;
}

export function useUpdateCompany() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateCompanyInput) => {
      const update: CompanyUpdate = {};
      if (patch.name !== undefined) update.name = patch.name;
      if (patch.logoUrl !== undefined) update.logo_url = patch.logoUrl;
      if (patch.archiveFolderName !== undefined) update.archive_folder_name = patch.archiveFolderName;
      if (patch.archiveStorageType !== undefined) update.archive_storage_type = patch.archiveStorageType;
      if (patch.archiveLocalPath !== undefined) update.archive_local_path = patch.archiveLocalPath;
      if (patch.printMode !== undefined) update.print_mode = patch.printMode;
      if (patch.printHeaderUrl !== undefined) update.print_header_url = patch.printHeaderUrl;
      if (patch.printFooterUrl !== undefined) update.print_footer_url = patch.printFooterUrl;
      if (patch.printFullPageUrl !== undefined) update.print_full_page_url = patch.printFullPageUrl;
      if (patch.printMarginTop !== undefined) update.print_margin_top = patch.printMarginTop;
      if (patch.printMarginBottom !== undefined) update.print_margin_bottom = patch.printMarginBottom;
      if (patch.printMarginLeft !== undefined) update.print_margin_left = patch.printMarginLeft;
      if (patch.printMarginRight !== undefined) update.print_margin_right = patch.printMarginRight;
      if (patch.headerColor !== undefined) update.header_color = patch.headerColor;

      const { error } = await supabase.from("companies").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });
}
