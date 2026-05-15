export const ONBOARDING_COMPLETED_KEY = 'onboarding_completed' as const;

/** Query flag: `?resetOnboarding=true` — сброс флага прохождения (для тестов). */
export const RESET_ONBOARDING_QUERY = 'resetOnboarding' as const;

/** Whether the user finished onboarding locally (before account creation). */
export function isOnboardingCompletedLocally(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
  } catch {
    return false;
  }
}
