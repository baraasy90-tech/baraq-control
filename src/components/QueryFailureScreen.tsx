import { useState } from "react";
import { PrimaryButton } from "@/components/ui";

export function QueryFailureScreen({ title, retry }: { title: string; retry: () => Promise<unknown> }) {
  const [pending, setPending] = useState(false);
  const reload = async () => {
    setPending(true);
    try { await retry(); } catch { /* Query state retains the failure and allows another attempt. */ }
    finally { setPending(false); }
  };
  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <h1 className="text-lg font-bold text-ink mb-4">{title}</h1>
      <p role="alert" className="text-critical mb-4">تعذّر تحميل البيانات. تحقق من الاتصال ثم أعد المحاولة.</p>
      <PrimaryButton disabled={pending} onClick={reload}>{pending ? "جارٍ التحميل..." : "إعادة المحاولة"}</PrimaryButton>
    </div>
  );
}
