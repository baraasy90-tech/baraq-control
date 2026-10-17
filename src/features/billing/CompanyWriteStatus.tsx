import { useCompanyWriteAccess } from "./useCompanyWriteAccess";

export function CompanyWriteStatus() {
  const { readOnly, checking, unavailable } = useCompanyWriteAccess();
  if (!readOnly) return null;
  return <p role="status" className="text-xs bg-warn-bg text-ink rounded-lg px-3 py-2 mb-4">
    {checking ? "جارٍ التحقق من صلاحية التعديل..." : unavailable
      ? "تعذّر التحقق من الاشتراك؛ التعديل متوقف مؤقتاً حتى يعود الاتصال."
      : "الحساب في وضع القراءة فقط. تبقى البيانات والمرفقات متاحة للاطلاع؛ التعديل متوقف حتى إعادة تفعيل الاشتراك."}
  </p>;
}
