import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthCard, FieldLabel, TextInput, PrimaryButton, SecondaryButton, ErrorText } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

export function ForgotPasswordScreen({ initialEmail = "", onBack }: { initialEmail?: string; onBack?: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError("");
    try {
      const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
      if (result.error) throw result.error;
      setSent(true);
    } catch (err) {
      const status = err && typeof err === "object" && "status" in err ? err.status : null;
      setError(status === 429 ? "طلبات كثيرة. انتظر قليلاً قبل طلب رابط جديد." : "تعذّر إرسال رابط الاستعادة حالياً. حاول لاحقاً، أو تواصل مع مسؤول التطبيق إذا استمر الخطأ.");
    } finally { setPending(false); }
  };
  return <AuthCard eyebrow="استعادة الحساب" title="نسيت كلمة المرور؟">
    {sent ? <div role="status" className="text-sm text-ink-soft space-y-3"><p>إذا كان البريد مرتبطاً بحساب، فستصلك رسالة تحتوي رابط تعيين كلمة مرور جديدة.</p><p>تحقق من البريد غير المرغوب فيه أيضاً. إذا لم تصل الرسالة، انتظر دقيقة قبل طلب رابط جديد، ثم تواصل مع مسؤول التطبيق إذا استمر التعذر.</p></div> :
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft">أدخل بريد حسابك لإرسال رابط الاستعادة. لا تشارك الرابط مع أي شخص.</p>
        <div><FieldLabel>البريد الإلكتروني</FieldLabel><TextInput type="email" autoComplete="email" required maxLength={254} autoFocus value={email} onChange={e => setEmail(e.target.value)} /></div>
        <ErrorText>{error}</ErrorText>
        <PrimaryButton type="submit" disabled={pending || !email.trim()}>{pending ? "جارٍ إرسال الطلب..." : "إرسال رابط الاستعادة"}</PrimaryButton>
      </form>}
    <div className="mt-4">{onBack ? <SecondaryButton onClick={onBack} className="w-full">العودة لتسجيل الدخول</SecondaryButton> : <Link to="/" className="text-sm text-primary underline">العودة لتسجيل الدخول</Link>}</div>
  </AuthCard>;
}
