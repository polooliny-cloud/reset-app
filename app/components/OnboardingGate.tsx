'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ONBOARDING_COMPLETED_KEY } from '@/lib/onboarding';

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const done =
      typeof window !== 'undefined' &&
      localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';

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
