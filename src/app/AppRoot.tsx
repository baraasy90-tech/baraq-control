import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthContext";
import { useProfile } from "@/features/company/useProfile";
import { LoginScreen } from "@/features/auth/LoginScreen";
import { SecureAccountScreen } from "@/features/auth/SecureAccountScreen";
import { NameEntryScreen } from "@/features/auth/NameEntryScreen";
import { useIdleLogout } from "@/features/auth/useIdleLogout";
import { getPendingJoinCode, clearPendingJoinCode } from "@/features/auth/pendingJoin";
import { getPendingIndividual, clearPendingIndividual } from "@/features/auth/pendingIndividual";
import { getErrorMessage } from "@/utils/errors";
import { useJoinCompanyByCode } from "@/features/auth/useJoinCompanyByCode";
import { useCreateIndividualAccount } from "@/features/company/useCreateIndividualAccount";
import { CompanyOnboardingWizard } from "@/features/company/CompanyOnboardingWizard";
import { SupportChatWidget } from "@/features/support/SupportChatWidget";
import { AppShell } from "@/app/AppShell";

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center p-5 text-sm text-ink-soft">{children}</div>;
}

function PendingJoinOrOnboarding({ fullName }: { fullName: string }) {
  const [code] = useState(() => getPendingJoinCode());
  const [isIndividual] = useState(() => getPendingIndividual());
  const [joinError, setJoinError] = useState<string | null>(null);
  const [individualError, setIndividualError] = useState<string | null>(null);
  const joinCompany = useJoinCompanyByCode();
  const createIndividualAccount = useCreateIndividualAccount();

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

  useEffect(() => {
    if (!isIndividual || code) return;
    createIndividualAccount.mutate(fullName, {
      onSuccess: () => clearPendingIndividual(),
      onError: (err) => {
        setIndividualError(getErrorMessage(err, "تعذّر إعداد مساحتك الشخصية"));
        clearPendingIndividual();
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIndividual, code]);

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

  if (isIndividual && !code) {
    if (individualError) {
      return (
        <CenteredMessage>
          <div className="text-center">
            <p className="text-critical mb-2">{individualError}</p>
            <p className="text-xs">حدّث الصفحة وحاول مجدداً.</p>
          </div>
        </CenteredMessage>
      );
    }
    return <CenteredMessage>جارٍ إعداد مساحتك الشخصية...</CenteredMessage>;
  }

  return <CompanyOnboardingWizard />;
}

function BrandMark() {
  return (
    <div className="fixed top-2 left-2 z-30 pointer-events-none select-none text-[10px] font-mono font-semibold tracking-[0.15em] text-ink-soft/35">
      BARAQ CONTROL
    </div>
  );
}

function AppRootContent() {
  const { session, loading: authLoading, error: authError } = useAuth();
  const profileQuery = useProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const companyScope = profileQuery.data?.profile.companyId;
  const previousScope = useRef<string | null | undefined>(undefined);
  const [tenantEpoch, setTenantEpoch] = useState(0);
  const scopeChanging = companyScope !== undefined && previousScope.current !== undefined && previousScope.current !== companyScope;
  useLayoutEffect(() => {
    if (companyScope === undefined) return;
    if (previousScope.current === undefined) { previousScope.current = companyScope; return; }
    if (previousScope.current === companyScope) return;
    let active = true;
    const predicate = (query: { queryKey: readonly unknown[] }) => query.queryKey[0] !== "profile";
    void queryClient.cancelQueries({ predicate }).then(() => {
      if (!active) return;
      queryClient.removeQueries({ predicate });
      queryClient.getMutationCache().clear();
      previousScope.current = companyScope;
      setTenantEpoch(value => value + 1);
      navigate("/", { replace: true });
    });
    return () => { active = false; };
  }, [companyScope, queryClient, navigate]);
  useIdleLogout(!!session);

  if (authLoading) return <CenteredMessage>جارٍ التحميل...</CenteredMessage>;
  if (authError) return <CenteredMessage>{authError}</CenteredMessage>;
  if (!session) return <LoginScreen />;
  if (session.user.is_anonymous) return <SecureAccountScreen />;
  if (profileQuery.isError) return <CenteredMessage>تعذّر تحميل البيانات، حدّث الصفحة وحاول مجدداً</CenteredMessage>;
  if (!profileQuery.data) return <CenteredMessage>جارٍ التحميل...</CenteredMessage>;
  if (scopeChanging) return <CenteredMessage>جارٍ تحديث بيانات الحساب...</CenteredMessage>;

  const { profile, company } = profileQuery.data;

  if (!profile.fullName) return <NameEntryScreen />;
  if (!company) return <PendingJoinOrOnboarding fullName={profile.fullName} />;

  return (
    <div key={`${company.id}:${tenantEpoch}`}>
      <AppShell>
        <Suspense fallback={<CenteredMessage>جارٍ التحميل...</CenteredMessage>}>
          <Outlet />
        </Suspense>
      </AppShell>
      <SupportChatWidget />
    </div>
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
