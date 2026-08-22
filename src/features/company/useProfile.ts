import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { getFileUrl } from "@/lib/supabase/storage";
import type { Database } from "@/lib/supabase/database.types";
import type { Company, Profile } from "@/types/domain";

type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];

export function mapCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    createdBy: row.created_by,
    name: row.name,
    companyCode: row.company_code,
    companyCodeExpiresAt: row.company_code_expires_at,
    countryCode: row.country_code,
    logoUrl: row.logo_url,
    archiveFolderName: row.archive_folder_name,
    archiveStorageType: row.archive_storage_type,
    archiveLocalPath: row.archive_local_path,
    print: {
      mode: row.print_mode,
      headerUrl: row.print_header_url,
      footerUrl: row.print_footer_url,
      fullPageUrl: row.print_full_page_url,
      marginTop: row.print_margin_top,
      marginBottom: row.print_margin_bottom,
      marginLeft: row.print_margin_left,
      marginRight: row.print_margin_right,
    },
    headerColor: row.header_color,
    vatRate: row.vat_rate,
    subscriptionStatus: row.subscription_status,
    trialEndsAt: row.trial_ends_at,
    subscriptionNote: row.subscription_note,
  };
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<{ profile: Profile; company: Company | null }> => {
      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, company_id, signature_url")
        .eq("id", user!.id)
        .single();
      if (profileError) throw profileError;

      let company: Company | null = null;
      if (profileRow.company_id) {
        const { data: companyRow, error: companyError } = await supabase
          .from("companies")
          .select("*")
          .eq("id", profileRow.company_id)
          .single();
        if (companyError) throw companyError;
        company = mapCompany(companyRow);
      }

      return {
        profile: {
          id: profileRow.id,
          fullName: profileRow.full_name,
          companyId: profileRow.company_id,
          signatureUrl: await getFileUrl("signatures", profileRow.signature_url),
        },
        company,
      };
    },
  });
}
