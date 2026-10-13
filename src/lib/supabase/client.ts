import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import "@/features/auth/passwordRecovery";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "متغيرات Supabase مفقودة — تأكد من إنشاء ملف .env بالقيم VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY (راجع .env.example و SUPABASE_SETUP.md)"
  );
}
export const AUTH_STORAGE_KEY = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;

// sessionStorage بدل localStorage عمداً — الجلسة تُمسح تلقائياً عند إغلاق المتصفح/التبويب فعلياً،
// فيلزم تسجيل دخول جديد في كل مرة (متطلب حماية صريح)، على عكس localStorage اللي يبقى للأبد.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: { storage: window.sessionStorage, storageKey: AUTH_STORAGE_KEY },
});

// Browser history must not restore a visual snapshot from a signed-out identity.
window.addEventListener("pagehide", () => {
  const root = document.getElementById("root");
  if (root) root.style.visibility = "hidden";
});
window.addEventListener("pageshow", event => {
  if (event.persisted) window.location.reload();
});

/** Lock this tab immediately, even if the Auth server is unreachable. */
export function logoutCurrentTab(accessToken?: string, destination?: "/") {
  let token = accessToken;
  try {
    if (!token) try {
      const saved = JSON.parse(window.sessionStorage.getItem(AUTH_STORAGE_KEY) ?? "null");
      if (typeof saved?.access_token === "string") token = saved.access_token;
    } catch { /* Invalid stored sessions must still be removed. */ }
    for (let index = window.sessionStorage.length - 1; index >= 0; index--) {
      const key = window.sessionStorage.key(index);
      if (key === AUTH_STORAGE_KEY || key?.startsWith(`${AUTH_STORAGE_KEY}-`)) window.sessionStorage.removeItem(key);
    }
  } catch { /* A reload also clears memory when browser storage is unavailable. */ }
  finally {
    if (token) void fetch(`${supabaseUrl.replace(/\/+$/, "")}/auth/v1/logout?scope=local`, {
      method: "POST", keepalive: true,
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` },
    }).catch(() => {});
    // A reload also discards in-memory credentials, cached data and pending callbacks.
    if (destination) window.location.replace(destination);
    else window.location.reload();
  }
}
