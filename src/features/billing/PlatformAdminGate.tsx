import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthContext";
import { useIsPlatformAdmin } from "./useIsPlatformAdmin";
import { supabase } from "@/lib/supabase/client";
import { Card, PrimaryButton, SecondaryButton, TextInput, FieldLabel, ErrorText } from "@/components/ui";
import { getUserErrorMessage } from "@/utils/errors";

export function PlatformAdminGate({ children }: { children: ReactNode }) {
  const { user, cacheEpoch } = useAuth();
  const admin = useIsPlatformAdmin();
  const cache = useQueryClient();
  const [enrollment, setEnrollment] = useState<{ id: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [authRevision, setAuthRevision] = useState(0);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => setAuthRevision(value => value + 1));
    return () => data.subscription.unsubscribe();
  }, []);
  const access = useQuery({
    queryKey: ["platform-admin-access", user?.id, cacheEpoch, authRevision],
    enabled: admin.data === true,
    queryFn: async () => {
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.error) throw assurance.error;
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;
      const granted = await supabase.rpc("has_platform_admin_access");
      if (granted.error) throw granted.error;
      return { ready: granted.data === true, revoked: assurance.data.currentLevel === "aal2" && !granted.data, factor: factors.data.totp[0]?.id };
    },
    staleTime: 0,
  });
  const action = async (enroll: boolean) => {
    if (pending) return;
    setPending(true); setError("");
    try {
      if (enroll) {
        const existing = await supabase.auth.mfa.listFactors();
        if (existing.error) throw existing.error;
        // Abandoned, unverified factors confer no protection; remove them before a new setup.
        for (const factor of existing.data.all.filter(f => f.factor_type === "totp" && f.status === "unverified")) {
          const removed = await supabase.auth.mfa.unenroll({ factorId: factor.id });
          if (removed.error) throw removed.error;
        }
        // Reuse this component's pending enrollment; never create factors on render.
        const result = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `BARAQ admin ${Date.now()}` });
        if (result.error) throw result.error;
        setEnrollment({ id: result.data.id, qr: result.data.totp.qr_code });
      } else {
        const factorId = access.data?.factor ?? enrollment?.id;
        if (!factorId || !/^\d{6}$/.test(code)) { setError("أدخل رمز التحقق المكوّن من 6 أرقام."); return; }
        const result = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
        if (result.error) throw result.error;
        setCode(""); setEnrollment(null);
        await cache.invalidateQueries({ queryKey: ["platform-admin-access"] });
      }
    } catch (err) { setError(getUserErrorMessage(err, "تعذّر التحقق. تأكد من الرمز والاتصال.")); }
    finally { setPending(false); }
  };
  if (admin.isPending || (admin.data && access.isPending)) return <p className="p-6">جارٍ التحقق من صلاحية الدخول...</p>;
  if (admin.isError || access.isError) return <Card><ErrorText>تعذّر التحقق من صلاحية الدخول.</ErrorText><SecondaryButton onClick={() => { void admin.refetch(); void access.refetch(); }}>إعادة المحاولة</SecondaryButton></Card>;
  if (!admin.data) return <Card><p>هذه النافذة محصورة بمدير المنصة.</p></Card>;
  if (access.data?.revoked) return <Card><p>صلاحية إدارة المنصة غير متاحة لهذا الحساب حالياً.</p></Card>;
  if (access.data?.ready) return <>{children}</>;
  return <div className="max-w-md mx-auto p-4"><Card>
    <h1 className="font-bold mb-3">حماية إدارة المنصة</h1>
    <p className="text-sm mb-4">يلزم التحقق بخطوتين للوصول إلى اشتراكات العملاء. استخدم تطبيق المصادقة على هاتفك.</p>
    {!access.data?.factor && !enrollment ? <PrimaryButton disabled={pending} onClick={() => void action(true)}>إعداد تطبيق المصادقة</PrimaryButton> : <>
      {enrollment && <><p className="text-sm">امسح الرمز بتطبيق المصادقة، ثم أدخل الرمز الناتج. احتفظ بالرمز على جهازك ولا تشاركه.</p><img src={enrollment.qr} alt="رمز إعداد المصادقة" className="w-56 h-56 mx-auto" /></>}
      <form onSubmit={(event) => { event.preventDefault(); void action(false); }}>
        <FieldLabel>رمز التحقق</FieldLabel>
        <TextInput value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" dir="ltr" />
        <PrimaryButton type="submit" disabled={pending || code.length !== 6} className="mt-3">{pending ? "جارٍ التحقق..." : "تحقق وافتح الإدارة"}</PrimaryButton>
      </form>
    </>}
    <ErrorText>{error}</ErrorText>
  </Card></div>;
}
