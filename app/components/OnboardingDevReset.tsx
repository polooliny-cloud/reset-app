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
      className="fixed bottom-3 left-3 z-[9999] rounded-lg border border-amber-700/40 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-950 shadow-sm hover:bg-amber-100"
    >
      Сбросить онбординг
    </button>
  );
}
