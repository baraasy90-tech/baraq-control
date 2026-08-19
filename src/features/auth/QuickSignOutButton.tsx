import { useState } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

/** زر تسجيل الخروج — يظهر أسفل القائمة الجانبية (AppShell)، متاح من أي شاشة لحماية
 * الحساب فوراً عند مغادرة الجهاز أو أثناء اجتماع بحضور ضيوف لا يجب أن يروا بيانات الشركة. */
export function QuickSignOutButton({ collapsed = false }: { collapsed?: boolean }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className={`flex items-center gap-1.5 px-2 py-2 ${collapsed ? "flex-col" : ""}`}>
        {!collapsed && <span className="text-[11px] text-ink-soft shrink-0">تأكيد الخروج؟</span>}
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
      className={`flex items-center gap-2 border-none bg-transparent text-critical text-xs font-semibold py-2.5 cursor-pointer hover:bg-critical-bg transition-colors ${
        collapsed ? "justify-center px-0" : "px-4"
      }`}
    >
      <LogOut size={16} strokeWidth={2.2} />
      {!collapsed && "تسجيل الخروج"}
    </button>
  );
}
