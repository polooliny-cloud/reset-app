'use client';

import { ONBOARDING_COMPLETED_KEY } from '@/lib/onboarding';

export function OnboardingDevReset() {
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <button
      type="button"
      onClick={() => {
        try {
          localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
        } catch {
          // ignore
        }
        window.location.reload();
      }}
      className="fixed bottom-3 left-3 z-[9999] rounded-lg border border-violet-500/40 bg-violet-100 px-2 py-1 text-xs font-medium text-violet-950 shadow-sm hover:bg-violet-200"
    >
      Сбросить онбординг
    </button>
  );
}
