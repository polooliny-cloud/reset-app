'use client';

import { useEffect } from 'react';

import { trackOnce } from '@/lib/analytics';
import { posthogCaptureOnce } from '@/lib/posthogCapture';

/** Локальная аналитика + PostHog (один раз за монтирование корня). */
export function AnalyticsAppMount() {
  useEffect(() => {
    trackOnce('app_open');
    posthogCaptureOnce('app_open');
  }, []);

  return null;
}
