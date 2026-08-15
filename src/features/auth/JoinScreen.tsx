import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthCard, FieldLabel, TextInput, PrimaryButton, SecondaryButton, ErrorText } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { getErrorMessage } from "@/utils/errors";

export function JoinScreen() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ companyName: string } | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  const acceptInvite = async () => {
    if (!token) return;
    const { data, error: rpcError } = await supabase.rpc("accept_invite", { p_token: token });
    if (rpcError) throw rpcError;
    const row = data?.[0];
    setSuccess({ companyName: row?.company_name ?? "" });
  };

  const canSubmit = email.trim().length > 3 && password.length >= 6 && (mode === "login" || fullName.trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setPendingConfirmation(true);
          return;
        }
      }
      await acceptInvite();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthCard eyebrow="دعوة" title="رابط غير صالح">
        <p className="text-sm text-ink-soft">هذا الرابط غير مكتمل، تأكد من نسخه كاملاً.</p>
      </AuthCard>
    );
  }

  if (pendingConfirmation) {
    return (
      <AuthCard eyebrow="تأكيد البريد" title="تحقق من بريدك الإلكتروني">
        <p className="text-sm text-ink-soft">
          أرسلنا رابط تأكيد إلى <strong className="text-ink">{email}</strong> — افتحه لتفعيل حسابك، ثم ارجع لنفس رابط
          الدعوة هذا وسجّل الدخول لإكمال الانضمام.
        </p>
      </AuthCard>
    );
  }

  if (success) {
    return (
      <AuthCard eyebrow="أهلاً بك" title="تم الانضمام بنجاح">
        <p className="text-sm text-ink-soft mb-4">
          انضممت بنجاح إلى <strong className="text-ink">{success.companyName}</strong>.
        </p>
        <PrimaryButton onClick={() => navigate("/")}>الدخول إلى المنصة</PrimaryButton>
      </AuthCard>
    );
  }

  if (!authLoading && session) {
    return (
      <AuthCard eyebrow="دعوة" title="قبول الدعوة">
        <p className="text-sm text-ink-soft mb-1">
          أنت مسجّل دخول حالياً بحساب <strong className="text-ink">{session.user.email || "بلا بريد (حساب مؤقت)"}</strong>.
        </p>
        <p className="text-xs text-ink-soft mb-4">إذا كانت هذه الدعوة لبريد مختلف، سجّل خروجاً أولاً ثم أنشئ الحساب الصحيح.</p>
        <ErrorText>{error}</ErrorText>
        <div className="flex flex-col gap-2">
          <PrimaryButton
            disabled={submitting}
            onClick={async () => {
              setError("");
              setSubmitting(true);
              try {
                await acceptInvite();
              } catch (err) {
                setError(getErrorMessage(err));
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "جارٍ الانضمام..." : "قبول الدعوة والانضمام بهذا الحساب"}
          </PrimaryButton>
          <SecondaryButton
            type="button"
            disabled={submitting}
            onClick={async () => {
              setError("");
              await supabase.auth.signOut();
            }}
            className="w-full"
          >
            ليس حسابي — تسجيل الخروج
          </SecondaryButton>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard eyebrow="دعوة للانضمام" title={mode === "signup" ? "أنشئ حسابك للانضمام" : "سجّل الدخول للانضمام"}>
      <p className="text-xs text-warn bg-warn-bg rounded-lg px-3 py-2 mb-4">
        استخدم نفس البريد الإلكتروني اللي وصلتك عليه الدعوة تحديداً، وإلا لن يتم قبولها.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === "signup" && (
          <div>
            <FieldLabel>الاسم الكامل</FieldLabel>
            <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="اكتب اسمك" autoFocus />
          </div>
        )}
        <div>
          <FieldLabel>البريد الإلكتروني</FieldLabel>
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
        </div>
        <div>
          <FieldLabel>كلمة المرور</FieldLabel>
          <TextInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6 أحرف على الأقل"
          />
        </div>

        <ErrorText>{error}</ErrorText>

        <PrimaryButton type="submit" disabled={!canSubmit || submitting}>
          {submitting ? "جارٍ المعالجة..." : mode === "signup" ? "إنشاء الحساب والانضمام" : "دخول وانضمام"}
        </PrimaryButton>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
          }}
          className="text-xs text-primary cursor-pointer bg-transparent border-none text-center"
        >
          {mode === "signup" ? "لديك حساب مسبقاً؟ سجّل الدخول" : "ليس لديك حساب؟ أنشئ حساباً جديداً"}
        </button>
      </form>
    </AuthCard>
  );
}
