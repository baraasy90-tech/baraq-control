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
