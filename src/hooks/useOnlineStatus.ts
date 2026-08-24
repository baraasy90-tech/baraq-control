import { useEffect, useState } from "react";

/** حالة الاتصال بالشبكة — React Query أصلاً يوقف أي قراءة/تعديل مؤقتاً (بدل فشلها)
 * عند انقطاع الاتصال ويستأنفها تلقائياً عند عودته (networkMode الافتراضي "online")؛
 * هذا الخطاف فقط لعرض تنبيه واضح للمستخدم أثناء ذلك بدل شاشة تبدو معلّقة بلا سبب. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}
