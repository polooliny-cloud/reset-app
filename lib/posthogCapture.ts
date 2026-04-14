import posthog from 'posthog-js';

const onceKeys = new Set<string>();

function isBrowser() {
  return typeof window !== 'undefined';
}

/** Один раз за жизнь модуля (защита от Strict Mode / повторных эффектов). */
export function posthogCaptureOnce(event: string) {
  if (!isBrowser()) return;
  if (onceKeys.has(event)) return;
  onceKeys.add(event);
  try {
    posthog.capture(event);
  } catch {
    // ignore
  }
}

export function posthogCapture(
  event: string,
  properties?: Record<string, unknown>,
) {
  if (!isBrowser()) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // ignore
  }
}
