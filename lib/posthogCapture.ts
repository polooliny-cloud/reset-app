import posthog from 'posthog-js';

const onceKeys = new Set<string>();
const POSTHOG_INIT_FLAG = '__posthog_initialized__';
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION;
export const POSTHOG_USER_ID_KEY = 'myapp_user_id';
const FIRST_VICTORY_CAPTURED_KEY = 'ph_first_victory_completed';

type EventProps = Record<string, unknown>;

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

function getClientPlatform(): 'ios' | 'android' | 'desktop' | 'unknown' {
  if (!isBrowser()) return 'unknown';
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/macintosh|windows|linux/.test(ua)) return 'desktop';
  return 'unknown';
}

function getInstalledState() {
  if (!isBrowser()) return false;
  const standaloneMedia =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  );
  return standaloneMedia || iosStandalone;
}

export function captureEvent(name: string, props?: EventProps) {
  const baseProps: EventProps = {
    platform: getClientPlatform(),
    is_installed: getInstalledState(),
  };
  if (APP_VERSION) {
    baseProps.app_version = APP_VERSION;
  }
  posthogCapture(name, { ...baseProps, ...props });
}

/** Стабильный anonymous id для PostHog identify (localStorage или новый UUID). */
export function getOrCreateUserId(): string {
  if (!isBrowser()) return '';
  try {
    let id = localStorage.getItem(POSTHOG_USER_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `u_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(POSTHOG_USER_ID_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

/**
 * Первая победа в приложении: один раз за всё время после полного таймера (90 с).
 * Защита от дублей: localStorage + ref на экране таймера.
 */
export function captureFirstVictoryIfNeeded() {
  if (!canCapturePosthog()) return;
  try {
    if (localStorage.getItem(FIRST_VICTORY_CAPTURED_KEY) === 'true') return;
    localStorage.setItem(FIRST_VICTORY_CAPTURED_KEY, 'true');
  } catch {
    return;
  }
  captureEvent('victory_completed', { source: 'timer' });
}
