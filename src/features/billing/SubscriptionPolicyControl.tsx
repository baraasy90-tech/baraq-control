import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSubscriptionAccess } from "./subscriptionAccess";
import { POLICY_LABELS } from "./subscriptionPolicy";
import { supabase } from "@/lib/supabase/client";
import { PrimaryButton, ErrorText } from "@/components/ui";
import { getUserErrorMessage } from "@/utils/errors";
import { useAuth } from "@/features/auth/AuthContext";

export function SubscriptionPolicyControl({companyId}: {companyId: string}) {
  const {user}=useAuth();const cache=useQueryClient();const [pending,setPending]=useState(false);const [error,setError]=useState("");
  const state=useQuery({queryKey:["subscription-policy",user?.id,companyId],queryFn:()=>getSubscriptionAccess(companyId)});
  const toggle=async()=>{
    if (!state.data || pending) return;
    setPending(true);setError("");
    try {
      const {error: failure}=await supabase.rpc("set_company_subscription_policy",{p_company_id:companyId,p_enabled:!state.data.enabled});
      if(failure)throw failure;
      await Promise.all([cache.invalidateQueries({queryKey:["subscription-policy"]}),cache.invalidateQueries({queryKey:["subscription-audit"]})]);
    }catch(err){setError(getUserErrorMessage(err));}finally{setPending(false);}
  };
  return <div className="bg-bg rounded-lg p-3 text-xs space-y-2">
    <h2 className="font-bold">سياسة التجربة والسماح لهذا الحساب</h2>
    {state.isPending && <p>جارٍ التحقق من السياسة...</p>}
    {state.isError && <p>تعذّر تحميل السياسة. أغلق النافذة وأعد المحاولة.</p>}
    {state.data && <>
      <p>السياسة {state.data.enabled?"مفعّلة":"غير مفعّلة"} · الحالة الزمنية: {POLICY_LABELS[state.data.stage]}</p>
      <p>بعد انتهاء التجربة: 30 يوماً للاستمرار مع تنبيه في التصديرات، ثم قراءة وتنزيل فقط.</p>
      {!state.data.enabled && ["read_only","canceled"].includes(state.data.stage) && <p className="text-critical font-bold">تفعيلها الآن يضع هذا الحساب فوراً في القراءة فقط لأن المهلة انتهت أو الاشتراك ملغى.</p>}
      <PrimaryButton disabled={pending} onClick={()=>void toggle()}>{pending?"جارٍ الحفظ...":state.data.enabled?"تعطيل السياسة لهذا الحساب":"تفعيل السياسة لهذا الحساب"}</PrimaryButton>
    </>}
    <ErrorText>{error}</ErrorText>
  </div>;
}
