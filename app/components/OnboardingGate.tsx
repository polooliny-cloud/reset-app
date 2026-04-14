'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  ONBOARDING_COMPLETED_KEY,
  RESET_ONBOARDING_QUERY,
} from '@/lib/onboarding';

/** Сброс флага + чистый URL; reload сбрасывает клиентские модули (аналитика онбординга). */
function applyResetOnboardingFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get(RESET_ONBOARDING_QUERY) !== 'true') return false;
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    url.searchParams.delete(RESET_ONBOARDING_QUERY);
    const nextSearch = url.searchParams.toString();
    const path = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
    window.history.replaceState(null, '', path);
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (applyResetOnboardingFromUrl()) return;

    let done = false;
    try {
      done = localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
    } catch {
      done = false;
    }

    if (pathname === '/onboarding') {
      if (done) {
        router.replace('/');
        return;
      }
      setChecked(true);
      return;
    }

    if (!done) {
      router.replace('/onboarding');
      return;
    }

    setChecked(true);
  }, [pathname, router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-gray-50">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700"
          aria-hidden
        />
      </div>
    );
  }

  return <>{children}</>;
}
