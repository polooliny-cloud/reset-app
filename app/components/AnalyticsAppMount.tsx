'use client';

import { useEffect } from 'react';

import { trackOnce } from '@/lib/analytics';
import { posthogCapture } from '@/lib/posthogCapture';

const PH_REGISTERED_KEY = 'ph_registered';
const PH_LAST_OPEN_KEY = 'ph_last_open';
const APP_OPEN_THROTTLE_MS = 1000 * 60 * 60 * 12;

/** Локальная аналитика + retention-события PostHog. */
export function AnalyticsAppMount() {
  useEffect(() => {
    trackOnce('app_open');

    try {
      if (!localStorage.getItem(PH_REGISTERED_KEY)) {
        posthogCapture('user_registered');
        localStorage.setItem(PH_REGISTERED_KEY, '1');
      }
    } catch {
      // ignore
    }

    try {
      const now = Date.now();
      const last = Number(localStorage.getItem(PH_LAST_OPEN_KEY) || 0);

      if (now - last > APP_OPEN_THROTTLE_MS) {
        posthogCapture('app_open');
        localStorage.setItem(PH_LAST_OPEN_KEY, now.toString());
      }
    } catch {
      // ignore
    }
  }, []);

  return null;
}
