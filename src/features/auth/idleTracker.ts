const LAST_ACTIVITY_KEY = "baraq_last_activity";

export const IDLE_TIMEOUT_MS = 60 * 60 * 1000;

export function recordActivity(): void {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  } catch {
    // localStorage غير متاح (وضع خاص متشدد مثلاً) — نتجاهل بصمت
  }
}

/** true لو مرّت ساعة كاملة منذ آخر نشاط مسجَّل (يشمل الفترة اللي كان فيها المتصفح مغلقاً). */
export function isIdleExpired(): boolean {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!raw) return false;
    const last = Number(raw);
    if (Number.isNaN(last)) return false;
    return Date.now() - last > IDLE_TIMEOUT_MS;
  } catch {
    return false;
  }
}
