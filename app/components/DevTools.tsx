'use client';

import { useProfileState } from '@/app/components/ProfileProvider';
import { useAuth } from '@/lib/auth/useAuth';
import {
  clearDevNavBypass,
  enableDevNavBypass,
  isLocalhostHost,
} from '@/lib/dev/localNav';
import { clearOnboardingPendingAuthSession } from '@/lib/onboarding';
import { clearOnboardingProgress } from '@/lib/onboardingProgress';

export function DevTools() {
  const { signOut } = useAuth();
  const { resetOnboardingInDb } = useProfileState();
  const showOnboardingReset = process.env.NODE_ENV === 'development';
  const showHomeNav = isLocalhostHost();

  if (!showOnboardingReset && !showHomeNav) return null;

  return (
    <div className="fixed bottom-3 left-3 z-[9999] flex flex-col gap-1.5">
      {showHomeNav ? (
        <>
          <button
            type="button"
            onClick={() => {
              enableDevNavBypass();
              window.location.assign('/');
            }}
            className="rounded-lg border border-emerald-500/40 bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-950 shadow-sm hover:bg-emerald-200"
          >
            Главный экран
          </button>
          <button
            type="button"
            onClick={() => {
              enableDevNavBypass();
              window.location.assign('/onboarding');
            }}
            className="rounded-lg border border-sky-500/40 bg-sky-100 px-2 py-1 text-xs font-medium text-sky-950 shadow-sm hover:bg-sky-200"
          >
            Онбординг
          </button>
        </>
      ) : null}
      {showOnboardingReset ? (
        <button
          type="button"
          onClick={() => {
            clearOnboardingPendingAuthSession();
            clearOnboardingProgress();
            clearDevNavBypass();
            void resetOnboardingInDb()
              .then(() => signOut())
              .then(() => {
                window.location.assign('/onboarding');
              });
          }}
          className="rounded-lg border border-violet-500/40 bg-violet-100 px-2 py-1 text-xs font-medium text-violet-950 shadow-sm hover:bg-violet-200"
        >
          Сбросить онбординг
        </button>
      ) : null}
    </div>
  );
}
