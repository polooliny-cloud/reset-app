'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

import {
  canUsePosthog,
  getOrCreateUserId,
  isPosthogInitialized,
  markPosthogInitialized,
  posthogCapture,
} from '@/lib/posthogCapture';

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

if (canUsePosthog() && posthogKey && !isPosthogInitialized()) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
  });
  markPosthogInitialized();
  try {
    const userId = getOrCreateUserId();
    if (userId) {
      posthog.identify(userId);
    }
    posthog.register({
      is_dev: process.env.NODE_ENV === 'development',
    });
  } catch {
    // ignore
  }
}

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || !posthogKey) return;
    try {
      let url = window.location.origin + pathname;
      const search = searchParams.toString();
      if (search) {
        url += `?${search}`;
      }
      posthogCapture('$pageview', { $current_url: url });
    } catch {
      // ignore
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
