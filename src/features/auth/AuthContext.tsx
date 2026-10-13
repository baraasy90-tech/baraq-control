import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, logoutCurrentTab, AUTH_STORAGE_KEY } from "@/lib/supabase/client";
import { isIdleExpired, recordActivity } from "@/features/auth/idleTracker";
import { recoveryCallback } from "./passwordRecovery";

const recoveryKey = `${AUTH_STORAGE_KEY}-recovery-user`;
function recoveryUser() {
  try { return sessionStorage.getItem(recoveryKey); } catch { return null; }
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  cacheEpoch: number;
  isPasswordRecovery: boolean;
  recoveryUserId: string | null;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheEpoch, setCacheEpoch] = useState(0);
  const [recoveryUserId, setRecoveryUserId] = useState<string | null>(recoveryUser);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => recoveryCallback || !!recoveryUser());
  const clearPasswordRecovery = () => {
    try { sessionStorage.removeItem(recoveryKey); } catch { /* Memory is cleared below. */ }
    setRecoveryUserId(null);
    setIsPasswordRecovery(false);
  };

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session && isIdleExpired() && !recoveryCallback) {
          logoutCurrentTab(data.session.access_token);
          return;
        } else {
          if (data.session) recordActivity();
          setSession(data.session);
        }
      } catch {
        if (!cancelled) setError("تعذّر الاتصال بـ Supabase — تحقق من ملف .env");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      // تسجيل دخول تفاعلي جديد — لازم يصفّر ساعة الخمول، وإلا طابع نشاط قديم متبقٍ من جلسة
      // سابقة (بأي عمر) يخلي useIdleLogout يسجّل خروجاً فورياً بعد الدخول مباشرة.
      if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") recordActivity();
      if (event === "SIGNED_IN" && recoveryUser() && recoveryUser() !== newSession?.user.id) clearPasswordRecovery();
      if (event === "PASSWORD_RECOVERY" && newSession) {
        try { sessionStorage.setItem(recoveryKey, newSession.user.id); } catch { /* Current-page flow remains available. */ }
        setRecoveryUserId(newSession.user.id);
        setIsPasswordRecovery(true);
        setCacheEpoch(epoch => epoch + 1);
      }
      // Also rotate the cache if sign-out/sign-in events are batched for the same user.
      if (event === "SIGNED_OUT") {
        clearPasswordRecovery();
        setCacheEpoch(epoch => epoch + 1);
      }
      setSession(newSession);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, error, cacheEpoch, isPasswordRecovery, recoveryUserId, clearPasswordRecovery }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth يجب أن يُستخدم داخل AuthProvider");
  return ctx;
}
