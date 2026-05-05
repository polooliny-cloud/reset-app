'use client';

import { useEffect } from 'react';

import { trackOnce } from '@/lib/analytics';
import { captureEvent } from '@/lib/posthogCapture';

const PH_REGISTERED_KEY = 'ph_registered';
const PH_LAST_OPEN_KEY = 'ph_last_open';
const APP_OPEN_THROTTLE_MS = 1000 * 60 * 60 * 12;
const WAS_INSTALLED_KEY = 'was_installed';
const APP_INSTALLED_SENT_KEY = 'app_installed_sent';

function isInstalledApp() {
  if (typeof window === 'undefined') return false;
  const standaloneMedia =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  );
  return standaloneMedia || iosStandalone;
}

/** Локальная аналитика + retention-события PostHog. */
export function AnalyticsAppMount() {
  useEffect(() => {
    trackOnce('app_open');

    try {
      if (!localStorage.getItem(PH_REGISTERED_KEY)) {
        captureEvent('user_registered');
        localStorage.setItem(PH_REGISTERED_KEY, '1');
      }
    } catch {
      // ignore
    }

    try {
      const now = Date.now();
      const last = Number(localStorage.getItem(PH_LAST_OPEN_KEY) || 0);

      if (now - last > APP_OPEN_THROTTLE_MS) {
        captureEvent('app_open');
        localStorage.setItem(PH_LAST_OPEN_KEY, now.toString());
      }
    } catch {
      // ignore
    }

    try {
      const currentInstalled = isInstalledApp();
      const wasInstalled = localStorage.getItem(WAS_INSTALLED_KEY) === 'true';
      const installedSent = localStorage.getItem(APP_INSTALLED_SENT_KEY) === 'true';

      if (!wasInstalled && currentInstalled && !installedSent) {
        captureEvent('app_installed');
        localStorage.setItem(APP_INSTALLED_SENT_KEY, 'true');
      }

      if (wasInstalled && !currentInstalled) {
        captureEvent('app_uninstalled');
      }

      localStorage.setItem(WAS_INSTALLED_KEY, currentInstalled ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, []);

  return null;
}
