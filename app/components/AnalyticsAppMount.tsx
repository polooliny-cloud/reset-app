'use client';

import { useEffect } from 'react';

import { trackOnce } from '@/lib/analytics';

/** Один раз за сессию монтирования корня приложения (см. trackOnce app_open). */
export function AnalyticsAppMount() {
  useEffect(() => {
    trackOnce('app_open');
  }, []);

  return null;
}
