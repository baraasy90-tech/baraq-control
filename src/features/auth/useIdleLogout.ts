import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { IDLE_TIMEOUT_MS, isIdleExpired, recordActivity } from "@/features/auth/idleTracker";

const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "wheel"] as const;
const CHECK_INTERVAL_MS = 30 * 1000;

export function useIdleLogout(active: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) return;

    const restartTimeout = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        supabase.auth.signOut();
      }, IDLE_TIMEOUT_MS);
    };

    // فحص فوري أولاً — لو التبويب كان معلّقاً بالخلفية (نوم الجهاز، تبويب مجمّد على الجوال)
    // لساعات ثم عاد، لا نثق بأي حدث نشاط جديد قبل التأكد أن الجلسة لم تنتهِ صلاحيتها أصلاً.
    const checkAndMaybeSignOut = (): boolean => {
      if (isIdleExpired()) {
        supabase.auth.signOut();
        return true;
      }
      return false;
    };

    const onActivity = () => {
      if (checkAndMaybeSignOut()) return;
      recordActivity();
      restartTimeout();
    };

    checkAndMaybeSignOut();
    restartTimeout();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));

    // يغطي حالة إغلاق/تعليق التبويب لفترة (نوم الجهاز مثلاً) دون تفعيل مؤقت setTimeout بدقة —
    // فحص دوري يعتمد على الوقت الفعلي المخزَّن بدل الاعتماد فقط على المؤقت الداخلي.
    const intervalId = setInterval(checkAndMaybeSignOut, CHECK_INTERVAL_MS);

    // أحداث متعددة لالتقاط "عودة" التبويب من الخلفية بأكثر من إشارة — بعض المتصفحات
    // (خصوصاً بالجوال) قد لا تُطلق visibilitychange بشكل موثوق بعد تعليق طويل.
    const handleResume = () => {
      if (document.visibilityState === "visible") checkAndMaybeSignOut();
    };
    document.addEventListener("visibilitychange", handleResume);
    window.addEventListener("focus", handleResume);
    window.addEventListener("pageshow", handleResume);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleResume);
      window.removeEventListener("focus", handleResume);
      window.removeEventListener("pageshow", handleResume);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
    };
  }, [active]);
}
