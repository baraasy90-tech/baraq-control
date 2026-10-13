import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthCard, FieldLabel, TextInput, PrimaryButton, ErrorText } from "@/components/ui";
import { useAuth } from "./AuthContext";
import { passwordValidationMessage, recoveryCallbackError } from "./passwordRecovery";
import { supabase, logoutCurrentTab } from "@/lib/supabase/client";
import { useIdleLogout } from "./useIdleLogout";

export function ResetPasswordScreen() {
  const { session, loading, recoveryUserId, clearPasswordRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useIdleLogout(!!session);
  const valid = !recoveryCallbackError && !!session && !session.user.is_anonymous && recoveryUserId === session.user.id;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || pending) return;
    const validation = passwordValidationMessage(password, confirmation);
    if (validation) { setError(validation); return; }
    setPending(true); setError("");
    try {
      const result = await supabase.auth.updateUser({ password });
      if (result.error) throw result.error;
      setPassword(""); setConfirmation(""); setDone(true);
      clearPasswordRecovery();
      // Revoke refresh sessions on all devices; local locking also works offline.
      void supabase.auth.signOut({ scope: "global" }).catch(() => {});
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? err.code : null;
      setError(code === "same_password" ? "اختر كلمة مرور تختلف عن الحالية." : code === "weak_password" ? "كلمة المرور لا تحقق شروط الأمان. اختر كلمة أقوى." : "تعذّر تحديث كلمة المرور. تحقق من الاتصال وحاول مجدداً، أو اطلب رابط استعادة جديداً.");
    } finally { setPending(false); }
  };
  if (loading) return <p role="status" className="p-6 text-center">جارٍ التحقق من رابط الاستعادة...</p>;
  if (done) return <AuthCard eyebrow="استعادة الحساب" title="تم تحديث كلمة المرور"><p role="status" className="text-sm text-ink-soft">استخدم كلمة المرور الجديدة لتسجيل الدخول. طُلب إنهاء الجلسات السابقة.</p><PrimaryButton className="mt-4 w-full" onClick={() => logoutCurrentTab(undefined, "/")}>تسجيل الدخول بالكلمة الجديدة</PrimaryButton></AuthCard>;
  if (!valid) return <AuthCard eyebrow="استعادة الحساب" title="رابط الاستعادة غير متاح"><p role="alert" className="text-sm text-ink-soft">افتح رابط الاستعادة من أحدث رسالة بريد. ربما انتهت صلاحيته أو استُخدم مسبقاً.</p><Link to="/forgot-password" className="mt-4 inline-block text-sm text-primary underline">طلب رابط استعادة جديد</Link></AuthCard>;
  return <AuthCard eyebrow="استعادة الحساب" title="تعيين كلمة مرور جديدة"><form onSubmit={submit} className="flex flex-col gap-4">
    <p className="text-sm text-ink-soft">اختر كلمة مرور قوية من 8 أحرف على الأقل.</p>
    <div><FieldLabel>كلمة المرور الجديدة</FieldLabel><TextInput type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} autoFocus /></div>
    <div><FieldLabel>تأكيد كلمة المرور الجديدة</FieldLabel><TextInput type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></div>
    <ErrorText>{error}</ErrorText><PrimaryButton type="submit" disabled={pending}>{pending ? "جارٍ التحديث..." : "حفظ كلمة المرور الجديدة"}</PrimaryButton>
  </form></AuthCard>;
}
