import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "متغيرات Supabase مفقودة — تأكد من إنشاء ملف .env بالقيم VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY (راجع .env.example و SUPABASE_SETUP.md)"
  );
}

// sessionStorage بدل localStorage عمداً — الجلسة تُمسح تلقائياً عند إغلاق المتصفح/التبويب فعلياً،
// فيلزم تسجيل دخول جديد في كل مرة (متطلب حماية صريح)، على عكس localStorage اللي يبقى للأبد.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: { storage: window.sessionStorage },
});
