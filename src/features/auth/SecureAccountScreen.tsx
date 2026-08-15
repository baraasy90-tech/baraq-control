import { useState } from "react";
import { AuthCard, FieldLabel, TextInput, PrimaryButton, SecondaryButton, ErrorText } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { getErrorMessage } from "@/utils/errors";

function isAlreadyRegisteredError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("already") && (lower.includes("registered") || lower.includes("exists"));
}

export function SecureAccountScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const canSubmit = email.trim().length > 3 && password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setEmailTaken(false);
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ email: email.trim(), password });
      if (updateError) throw updateError;
      setPendingConfirmation(true);
    } catch (err) {
      const message = getErrorMessage(err);
      if (isAlreadyRegisteredError(message)) {
        setEmailTaken(true);
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseExistingAccount = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
  };

  if (emailTaken) {
    return (
      <AuthCard eyebrow="تنبيه" title="هذا البريد مسجّل بحساب آخر">
        <p className="text-sm text-ink-soft mb-4">
          البريد <strong className="text-ink">{email}</strong> مرتبط بحساب موجود مسبقاً — إما إنك سبق وأمّنت هذا
          الجهاز بنفس البريد (تحقق من بريدك، حتى مجلد الرسائل غير المرغوبة، عن رابط تأكيد أُرسل سابقاً)، أو إنك
          أنشأت حساباً منفصلاً بهذا البريد من قبل بجهاز أو متصفح آخر.
        </p>
        <p className="text-xs text-warn bg-warn-bg rounded-lg px-3 py-2 mb-4">
          لو ضغطت "تسجيل الدخول بحسابك الموجود"، بتخرج من الجلسة الحالية بهذا الجهاز — بيانات هذا الجهاز (لو كانت
          مختلفة عن الحساب الموجود) ما راح تنتقل تلقائياً. لو مو متأكد، جرّب أول تتحقق من بريدك.
        </p>
        <div className="flex flex-col gap-2">
          <SecondaryButton onClick={() => setEmailTaken(false)} className="w-full">
            رجوع، أبي أتحقق من بريدي أول
          </SecondaryButton>
          <PrimaryButton onClick={handleUseExistingAccount} disabled={signingOut}>
            {signingOut ? "جارٍ الخروج..." : "تسجيل الدخول بحسابك الموجود"}
          </PrimaryButton>
        </div>
      </AuthCard>
    );
  }

  if (pendingConfirmation) {
    return (
      <AuthCard eyebrow="خطوة أخيرة" title="تحقق من بريدك الإلكتروني">
        <p className="text-sm text-ink-soft">
          أرسلنا رابط تأكيد إلى <strong className="text-ink">{email}</strong> — افتحه لإتمام تأمين حسابك. بعد
          الضغط على الرابط، حدّث هذه الصفحة وراح تدخل مباشرة على بياناتك كما هي.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard eyebrow="خطوة مهمة" title="أمّن حسابك ببريد إلكتروني">
      <p className="text-sm text-ink-soft mb-4">
        حسابك الحالي مرتبط بهذا الجهاز فقط — لو مسحت بيانات المتصفح بتفقد الوصول لكل بياناتك (المشاريع والتقارير)
        نهائياً. أضف بريد إلكتروني وكلمة مرور مرة واحدة لتأمين حسابك، مع الاحتفاظ بكل بياناتك الحالية كما هي.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <FieldLabel>البريد الإلكتروني</FieldLabel>
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" autoFocus />
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
          {submitting ? "جارٍ الحفظ..." : "تأمين الحساب"}
        </PrimaryButton>
      </form>
    </AuthCard>
  );
}
