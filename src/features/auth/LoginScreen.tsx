import { useState } from "react";
import { UserPlus, LogIn, Briefcase } from "lucide-react";
import { AuthCard, FieldLabel, TextInput, PrimaryButton, SecondaryButton, ErrorText } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { setPendingJoinCode } from "@/features/auth/pendingJoin";
import { getErrorMessage } from "@/utils/errors";

type Screen = "choice" | "login" | "signup" | "employeeSignup";

function isAlreadyRegisteredError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("already") && (lower.includes("registered") || lower.includes("exists"));
}

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة";
  if (isAlreadyRegisteredError(message)) return "هذا البريد مسجَّل مسبقاً بحساب قائم — يمكنك تسجيل الدخول به مباشرة";
  return message;
}

export function LoginScreen() {
  const [screen, setScreen] = useState<Screen>("choice");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [error, setError] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isSignup = screen === "signup" || screen === "employeeSignup";
  const canSubmit =
    email.trim().length > 3 &&
    password.length >= 6 &&
    (screen === "login" || fullName.trim().length > 0) &&
    (screen !== "employeeSignup" || companyCode.trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      if (screen === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
      } else {
        if (screen === "employeeSignup") setPendingJoinCode(companyCode);
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setPendingConfirmation(true);
        }
      }
    } catch (err) {
      const message = getErrorMessage(err, "حدث خطأ غير متوقّع");
      if (isAlreadyRegisteredError(message)) {
        setScreen("login");
      }
      setError(translateAuthError(message));
    } finally {
      setSubmitting(false);
    }
  };

  if (pendingConfirmation) {
    return (
      <AuthCard eyebrow="تأكيد البريد الإلكتروني" title="تحقّق من بريدك الإلكتروني">
        <p className="text-sm text-ink-soft">
          أرسلنا رابط تفعيل إلى <strong className="text-ink">{email}</strong>، يرجى فتحه لتفعيل حسابك، ثم العودة
          لتسجيل الدخول.
        </p>
        <div className="mt-4">
          <SecondaryButton onClick={() => setPendingConfirmation(false)} className="w-full">
            العودة
          </SecondaryButton>
        </div>
      </AuthCard>
    );
  }

  if (screen === "choice") {
    return (
      <AuthCard eyebrow="أهلاً بك" title="كيف تودّ المتابعة؟">
        <div className="flex flex-col gap-3">
          <div>
            <PrimaryButton
              onClick={() => setScreen("login")}
              className="w-full inline-flex items-center justify-center gap-2"
            >
              <LogIn size={16} strokeWidth={2.5} /> تسجيل الدخول
            </PrimaryButton>
            <p className="text-xs text-ink-soft mt-1.5 text-center">
              يمكنك تسجيل الدخول من خلال بريدك الإلكتروني إذا كان لديك حساب مسجَّل مسبقاً
            </p>
          </div>
          <div>
            <SecondaryButton
              onClick={() => setScreen("signup")}
              className="w-full inline-flex items-center justify-center gap-2"
            >
              <UserPlus size={16} strokeWidth={2.5} /> إنشاء حساب مدير
            </SecondaryButton>
            <p className="text-xs text-ink-soft mt-1.5 text-center">
              أنشئ حساباً جديداً كمالك لشركة جديدة على المنصة لأول مرة
            </p>
          </div>
          <div>
            <SecondaryButton
              onClick={() => setScreen("employeeSignup")}
              className="w-full inline-flex items-center justify-center gap-2"
            >
              <Briefcase size={16} strokeWidth={2.5} /> إنشاء حساب موظف
            </SecondaryButton>
            <p className="text-xs text-ink-soft mt-1.5 text-center">
              انضم لشركة موجودة بالفعل باستخدام رمز الشركة الذي يزوّدك به مدير الحساب
            </p>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      eyebrow={screen === "login" ? "تسجيل الدخول" : screen === "employeeSignup" ? "حساب موظف" : "حساب مدير"}
      title={screen === "login" ? "تسجيل الدخول" : screen === "employeeSignup" ? "إنشاء حساب موظف" : "إنشاء حساب مدير"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isSignup && (
          <div>
            <FieldLabel>الاسم الكامل</FieldLabel>
            <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="اكتب اسمك" autoFocus />
          </div>
        )}
        <div>
          <FieldLabel>البريد الإلكتروني</FieldLabel>
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            autoFocus={screen === "login"}
          />
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

        {screen === "employeeSignup" && (
          <div>
            <FieldLabel>رمز الشركة</FieldLabel>
            <TextInput
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value)}
              placeholder="مثال: A1B2C3"
              className="font-mono"
            />
            <p className="text-xs text-ink-soft mt-1">اطلب هذا الرمز من مدير الحساب — يجده بلوحة التحكم</p>
          </div>
        )}

        <ErrorText>{error}</ErrorText>

        <PrimaryButton type="submit" disabled={!canSubmit || submitting} className="inline-flex items-center justify-center gap-2">
          {submitting ? "جارٍ التحقّق..." : screen === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}
        </PrimaryButton>

        <SecondaryButton
          type="button"
          onClick={() => {
            setScreen("choice");
            setError("");
          }}
          className="w-full"
        >
          العودة
        </SecondaryButton>
      </form>
    </AuthCard>
  );
}
