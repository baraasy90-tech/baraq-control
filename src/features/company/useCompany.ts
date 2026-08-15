import { useProfile } from "@/features/company/useProfile";
import type { Company, Profile } from "@/types/domain";

/**
 * يُستخدم فقط داخل مسارات محمية بواسطة AppRoot (بعد التأكد من وجود شركة وملف شخصي).
 */
export function useCompany(): { company: Company; profile: Profile } {
  const { data } = useProfile();
  if (!data || !data.company) {
    throw new Error("useCompany يجب أن يُستخدم بعد التأكد من إعداد الشركة");
  }
  return { company: data.company, profile: data.profile };
}
