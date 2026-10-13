/**
 * أخطاء Supabase (PostgrestError، AuthError، FunctionsError) ليست instanceof Error
 * دائماً رغم احتوائها على .message — لذا `err instanceof Error` وحدها تُخفي رسالة
 * الخطأ الفعلية وتُظهر نص عام بدلها. هذه الدالة تستخرج الرسالة من أي شكل خطأ.
 */
export function getErrorMessage(err: unknown, fallback = "حدث خطأ"): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (typeof err === "string") return err;
  return fallback;
}

/** Present actionable Arabic messages without exposing database or network internals. */
export function getUserErrorMessage(err: unknown, fallback = "تعذّرت العملية، حاول مجدداً"): string {
  const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
  const messages: Record<string, string> = {
    "PGRST116": "السجل غير موجود أو تغيّرت صلاحياتك. حدّث الصفحة وحاول مجدداً.",
    "42501": "لا تملك صلاحية تنفيذ هذه العملية.",
    "23505": "يوجد سجل بهذه البيانات مسبقاً. حدّث القائمة قبل إعادة المحاولة.",
    "23503": "البيانات مرتبطة بسجل آخر غير متاح أو لا يمكن حذفه. حدّث القائمة وتحقق من الارتباطات.",
    "23514": "بعض القيم غير مسموحة. راجع البيانات المدخلة.",
    "57014": "استغرقت العملية وقتاً طويلاً. تحقق من نتيجتها قبل إعادة المحاولة.",
    "invalid_credentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    "weak_password": "كلمة المرور ضعيفة. اختر كلمة مرور أقوى.",
    "email_address_invalid": "أدخل عنوان بريد إلكتروني صحيحاً.",
  };
  const message = getErrorMessage(err, "");
  // Workflow procedures already provide specific Arabic explanations.
  if (/[\u0600-\u06ff]/.test(message)) return message;
  if (messages[code]) return messages[code];
  if (/fetch|network|offline|connection/i.test(message)) return "تعذّر الاتصال. تحقق من الاتصال ومن نتيجة العملية قبل إعادة المحاولة.";
  return fallback;
}
