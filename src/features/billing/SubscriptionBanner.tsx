import { useQuery } from "@tanstack/react-query";
import { getSubscriptionAccess } from "./subscriptionAccess";
import { useAuth } from "@/features/auth/AuthContext";
import { fmt } from "@/utils/dates";
import type { ReactNode } from "react";
export function SubscriptionBanner({companyId,children}: {companyId:string;children:ReactNode}) {
  const {user}=useAuth();
  const state=useQuery({queryKey:["subscription-policy",user?.id,companyId],queryFn:()=>getSubscriptionAccess(companyId),refetchInterval:60000});
  if(state.isError)return <div role="status" className="bg-warn/10 px-4 py-2 text-xs text-center">تعذّر تحديث حالة الاشتراك. أعد تحميل الصفحة إذا استمر التنبيه.</div>;
  const access=state.data;if(!access?.enabled)return <>{children}</>;
  if(access.stage==="active")return null;
  const days=Math.max(0,Math.ceil((Date.parse(access.grace_ends_at)-Date.parse(access.server_now))/86400000));
  if(access.stage==="trial")return <>{children}</>;
  return <div role="status" className="bg-warn/10 border-b border-warn/30 px-4 py-2 text-xs font-semibold text-center">
    {access.can_write?`انتهت الفترة التجريبية. يمكنك متابعة العمل خلال مهلة السماح حتى ${fmt(access.grace_ends_at)} (${days} يوم). التصديرات الجديدة تحمل تنبيه الاشتراك.`:
      "الحساب في وضع القراءة فقط. يمكنك عرض البيانات وتنزيلها؛ تواصل مع مدير المنصة لإعادة التفعيل."}
  </div>;
}
