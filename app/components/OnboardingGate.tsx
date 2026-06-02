'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useDevNavBypass } from '@/app/hooks/useDevNavBypass';
import { useProfileState } from '@/app/components/ProfileProvider';
import { RESET_ONBOARDING_QUERY } from '@/lib/onboarding';
import { isPublicPath } from '@/lib/routing/publicPaths';
import { useAuth } from '@/lib/auth/useAuth';

function GateLoading() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-[#090d14]">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-violet-300"
        aria-hidden
      />
    </div>
  );
}

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, initializing: authInitializing } = useAuth();
  const { appReady, onboardingCompleted, resetOnboardingInDb } = useProfileState();
  const devBypass = useDevNavBypass();
  const [checked, setChecked] = useState(false);
  const [checkedPath, setCheckedPath] = useState<string | null>(null);

  useEffect(() => {
    if (authInitializing || !appReady) return;

    const markChecked = () => {
      window.setTimeout(() => {
        setChecked(true);
        setCheckedPath(pathname);
      }, 0);
    };

    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get(RESET_ONBOARDING_QUERY) === 'true') {
          void resetOnboardingInDb().then(() => {
            url.searchParams.delete(RESET_ONBOARDING_QUERY);
            const nextSearch = url.searchParams.toString();
            const path = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
            window.history.replaceState(null, '', path);
            window.location.reload();
          });
          return;
        }
      } catch {
        // ignore
      }
    }

    if (devBypass) {
      markChecked();
      return;
    }

    if (session?.user && onboardingCompleted) {
      if (pathname === '/onboarding') {
        router.replace('/');
        return;
      }
      markChecked();
      return;
    }

    if (pathname === '/onboarding') {
      markChecked();
      return;
    }

    if (!session?.user) {
      if (isPublicPath(pathname)) {
        markChecked();
        return;
      }
      router.replace('/');
      return;
    }

    if (!onboardingCompleted) {
      router.replace('/onboarding');
      return;
    }

    markChecked();
  }, [
    authInitializing,
    appReady,
    pathname,
    router,
    session?.user,
    onboardingCompleted,
    resetOnboardingInDb,
    devBypass,
  ]);

  if (authInitializing || !appReady || !checked || checkedPath !== pathname) {
    return <GateLoading />;
  }

  return <>{children}</>;
}
