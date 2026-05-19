/** Query flag: `?resetOnboarding=true` — сброс onboarding в profiles (dev). */
export const RESET_ONBOARDING_QUERY = "resetOnboarding" as const;

/**
 * Временный UI-флаг (sessionStorage): пользователь прошёл install-flow,
 * но ещё не вошёл — показываем экран регистрации вместо welcome.
 * Не дублирует profiles.onboarding_completed.
 */
export const ONBOARDING_PENDING_AUTH_SESSION_KEY =
  "onboarding_pending_auth_standalone" as const;

export function setOnboardingPendingAuthSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ONBOARDING_PENDING_AUTH_SESSION_KEY, "true");
  } catch {
    // ignore
  }
}

export function clearOnboardingPendingAuthSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(ONBOARDING_PENDING_AUTH_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function hasOnboardingPendingAuthSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(ONBOARDING_PENDING_AUTH_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}
