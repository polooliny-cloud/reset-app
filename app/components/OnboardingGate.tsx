'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useProfileState } from '@/app/components/ProfileProvider';
import { RESET_ONBOARDING_QUERY } from '@/lib/onboarding';
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
  const { session } = useAuth();
  const { appReady, onboardingCompleted, resetOnboardingInDb } = useProfileState();
  const [checked, setChecked] = useState(false);
  const [checkedPath, setCheckedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!appReady) return;

    setChecked(false);
    setCheckedPath(null);

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

    if (pathname === '/onboarding') {
      if (session?.user && onboardingCompleted) {
        router.replace('/');
        return;
      }
      setChecked(true);
      setCheckedPath(pathname);
      return;
    }

    if (!session?.user) {
      router.replace('/onboarding');
      return;
    }

    if (!onboardingCompleted) {
      router.replace('/onboarding');
      return;
    }

    setChecked(true);
    setCheckedPath(pathname);
  }, [appReady, pathname, router, session?.user, onboardingCompleted, resetOnboardingInDb]);

  if (!appReady || !checked || checkedPath !== pathname) {
    return <GateLoading />;
  }

  return <>{children}</>;
}
