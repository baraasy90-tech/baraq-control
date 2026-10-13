// Capture callback intent before the Auth client removes credentials from the URL.
const callback = new URLSearchParams(typeof window === "undefined" ? "" : window.location.hash.slice(1));
export const recoveryCallback = callback.get("type") === "recovery";
export const recoveryCallbackError = callback.has("error") || callback.has("error_code");

export function passwordValidationMessage(password: string, confirmation: string): string | null {
  if (password.length < 8) return "استخدم كلمة مرور من 8 أحرف على الأقل.";
  if (password !== confirmation) return "كلمتا المرور غير متطابقتين.";
  return null;
}
