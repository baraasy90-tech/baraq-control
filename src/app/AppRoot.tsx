import { Suspense, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { useProfile } from "@/features/company/useProfile";
import { LoginScreen } from "@/features/auth/LoginScreen";
import { SecureAccountScreen } from "@/features/auth/SecureAccountScreen";
import { NameEntryScreen } from "@/features/auth/NameEntryScreen";
import { useIdleLogout } from "@/features/auth/useIdleLogout";
import { getPendingJoinCode, clearPendingJoinCode } from "@/features/auth/pendingJoin";
import { getErrorMessage } from "@/utils/errors";
import { useJoinCompanyByCode } from "@/features/auth/useJoinCompanyByCode";
import { CompanyOnboardingWizard } from "@/features/company/CompanyOnboardingWizard";
import { SupportChatWidget } from "@/features/support/SupportChatWidget";
import { QuickSignOutButton } from "@/features/auth/QuickSignOutButton";
import { AppShell } from "@/app/AppShell";

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center p-5 text-sm text-ink-soft">{children}</div>;
}

function PendingJoinOrOnboarding() {
  const [code] = useState(() => getPendingJoinCode());
  const [joinError, setJoinError] = useState<string | null>(null);
  const joinCompany = useJoinCompanyByCode();

  useEffect(() => {
    if (!code) return;
    joinCompany.mutate(code, {
      onSuccess: (result) => {
        if (!result) {
          setJoinError("رمز الشركة غير صحيح");
          clearPendingJoinCode();
          return;
        }
        clearPendingJoinCode();
      },
      onError: (err) => {
        setJoinError(getErrorMessage(err, "تعذّر الانضمام للشركة"));
        clearPendingJoinCode();
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (code && joinCompany.isPending) {
    return <CenteredMessage>جارٍ الانضمام للشركة...</CenteredMessage>;
  }

  if (joinError) {
    return (
      <CenteredMessage>
        <div className="text-center">
          <p className="text-critical mb-2">{joinError}</p>
          <p className="text-xs">تواصل مع مدير الحساب للتأكد من رمز الشركة، ثم حدّث الصفحة وحاول مجدداً.</p>
        </div>
      </CenteredMessage>
    );
  }

  return <CompanyOnboardingWizard />;
}

function BrandMark() {
  return (
    <div className="fixed bottom-2 left-2 z-40 pointer-events-none select-none text-[10px] font-mono font-semibold tracking-[0.15em] text-ink-soft/35">
      BARAQ CONTROL
    </div>
  );
}

function AppRootContent() {
  const { session, loading: authLoading, error: authError } = useAuth();
  const profileQuery = useProfile();
  useIdleLogout(!!session);

  if (authLoading) return <CenteredMessage>جارٍ التحميل...</CenteredMessage>;
  if (authError) return <CenteredMessage>{authError}</CenteredMessage>;
  if (!session) return <LoginScreen />;
  if (session.user.is_anonymous) return <SecureAccountScreen />;
  if (profileQuery.isError) return <CenteredMessage>تعذّر تحميل البيانات، حدّث الصفحة وحاول مجدداً</CenteredMessage>;
  if (!profileQuery.data) return <CenteredMessage>جارٍ التحميل...</CenteredMessage>;

  const { profile, company } = profileQuery.data;

  if (!profile.fullName) return <NameEntryScreen />;
  if (!company) return <PendingJoinOrOnboarding />;

  return (
    <>
      <AppShell>
        <Suspense fallback={<CenteredMessage>جارٍ التحميل...</CenteredMessage>}>
          <Outlet />
        </Suspense>
      </AppShell>
      <SupportChatWidget />
      <QuickSignOutButton />
    </>
  );
}

export function AppRoot() {
  return (
    <>
      <AppRootContent />
      <BrandMark />
    </>
  );
}
