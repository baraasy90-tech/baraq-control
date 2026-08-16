import { useState } from "react";
import { Lock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

/** زر تسجيل خروج سريع ثابت الموقع، متاح من أي شاشة — لحماية الحساب فوراً عند مغادرة
 * الجهاز أو أثناء اجتماع بحضور ضيوف لا يجب أن يروا بيانات الشركة. */
export function QuickSignOutButton() {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="fixed top-2 left-2 z-40 flex items-center gap-1.5 bg-panel border border-line/60 shadow-sm rounded-lg px-2 py-1.5">
        <span className="text-[11px] text-ink-soft">تأكيد الخروج؟</span>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-[11px] font-bold text-white bg-critical rounded px-2 py-1 border-none cursor-pointer"
        >
          نعم
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-[11px] text-ink-soft bg-transparent border-none cursor-pointer px-1"
        >
          إلغاء
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title="تسجيل الخروج / حماية الحساب"
      className="fixed top-2 left-2 z-40 flex items-center gap-1 bg-panel/90 border border-line/60 shadow-sm rounded-lg px-2 py-1.5 text-[11px] text-ink-soft cursor-pointer hover:text-ink"
    >
      <Lock size={12} strokeWidth={2.5} />
      خروج
    </button>
  );
}
