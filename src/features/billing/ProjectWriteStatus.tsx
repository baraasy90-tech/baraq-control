import { useSubscriptionWriteAccess } from "./useSubscriptionWriteAccess";

export function ProjectWriteStatus({ projectId }: { projectId: string }) {
  const { readOnly, checking, unavailable } = useSubscriptionWriteAccess(projectId);
  if (!readOnly) return null;
  return <p role="status" className="text-xs bg-warn-bg text-ink rounded-lg px-3 py-2 mb-4">
    {checking ? "جارٍ التحقق من صلاحية تعديل المشروع..." : unavailable
      ? "تعذّر التحقق من الاشتراك؛ التعديل متوقف مؤقتاً حتى يعود الاتصال."
      : "المشروع في وضع القراءة فقط. يمكنك الاطلاع والطباعة والتصدير؛ التعديل والاعتماد متوقفان حتى إعادة تفعيل الاشتراك."}
  </p>;
}
