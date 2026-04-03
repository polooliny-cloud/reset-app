export type EventName =
  | 'app_open'
  | 'onboarding_start'
  | 'onboarding_complete'
  | 'sos_click'
  | 'sos_completed'
  | 'reset_click';

export const EVENTS_KEY = 'analytics_events_v1';
export const METRICS_KEY = 'analytics_metrics_v1';

const firedFlags: Partial<Record<EventName, boolean>> = {};

export function safeParse<T>(value: string | null, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function trackEvent(name: EventName) {
  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    const events = safeParse<{ name: EventName; timestamp: number }[]>(
      raw,
      [],
    );

    events.push({
      name,
      timestamp: Date.now(),
    });

    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch {
    // ignore
  }
}

export function incrementMetric(name: EventName) {
  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem(METRICS_KEY);
    const metrics = safeParse<Record<string, number>>(raw, {});

    metrics[name] = (metrics[name] ?? 0) + 1;

    localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
  } catch {
    // ignore
  }
}

export function trackOnce(name: EventName) {
  if (firedFlags[name]) return;
  firedFlags[name] = true;

  trackEvent(name);
  incrementMetric(name);
}

export function getMetrics(): Record<string, number> | null {
  if (typeof window === 'undefined') return null;
  return safeParse<Record<string, number>>(
    localStorage.getItem(METRICS_KEY),
    {},
  );
}

export function getEvents(): { name: EventName; timestamp: number }[] | null {
  if (typeof window === 'undefined') return null;
  return safeParse<{ name: EventName; timestamp: number }[]>(
    localStorage.getItem(EVENTS_KEY),
    [],
  );
}
