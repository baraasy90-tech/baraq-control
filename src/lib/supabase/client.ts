import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "متغيرات Supabase مفقودة — تأكد من إنشاء ملف .env بالقيم VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY (راجع .env.example و SUPABASE_SETUP.md)"
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
