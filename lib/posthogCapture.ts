import posthog from 'posthog-js';

const onceKeys = new Set<string>();
const POSTHOG_INIT_FLAG = '__posthog_initialized__';

function isBrowser() {
  return typeof window !== 'undefined';
}

function isPosthogEnabled() {
  if (!isBrowser()) return false;
  if (process.env.NODE_ENV !== 'production') return false;
  return window.location.hostname !== 'localhost';
}

export function canUsePosthog() {
  return isPosthogEnabled();
}

export function markPosthogInitialized() {
  if (!isBrowser()) return;
  (window as Window & { [POSTHOG_INIT_FLAG]?: boolean })[POSTHOG_INIT_FLAG] = true;
}

export function isPosthogInitialized() {
  if (!isBrowser()) return false;
  return Boolean(
    (window as Window & { [POSTHOG_INIT_FLAG]?: boolean })[POSTHOG_INIT_FLAG],
  );
}

function canCapturePosthog() {
  return isPosthogEnabled() && isPosthogInitialized();
}

/** Один раз за жизнь модуля (защита от Strict Mode / повторных эффектов). */
export function posthogCaptureOnce(event: string) {
  if (!canCapturePosthog()) return;
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
  if (!canCapturePosthog()) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // ignore
  }
}
