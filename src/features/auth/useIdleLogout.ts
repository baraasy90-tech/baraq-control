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

    // نشاط حقيقي من المستخدم فقط — لا نُسجّله عند مجرّد تركيب الشاشة، حتى لا نطمس
    // طابع زمني قديم (من جلسة سابقة) قبل ما يتحقق AuthContext منه عند التحميل.
    const onActivity = () => {
      recordActivity();
      restartTimeout();
    };

    restartTimeout();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));

    // يغطي حالة إغلاق/تعليق التبويب لفترة (نوم الجهاز مثلاً) دون تفعيل مؤقت setTimeout بدقة —
    // فحص دوري يعتمد على الوقت الفعلي المخزَّن بدل الاعتماد فقط على المؤقت الداخلي.
    const intervalId = setInterval(() => {
      if (isIdleExpired()) supabase.auth.signOut();
    }, CHECK_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && isIdleExpired()) {
        supabase.auth.signOut();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
    };
  }, [active]);
}
