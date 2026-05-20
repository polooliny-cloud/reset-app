/** Session flag: home should show premium loading until refetch after onboarding trial. */
export const TRIAL_ACTIVATION_PENDING_KEY = "reset_trial_activation_pending";

export function markTrialActivationPending(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TRIAL_ACTIVATION_PENDING_KEY, "1");
  } catch {
    // ignore
  }
}

export function consumeTrialActivationPending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = sessionStorage.getItem(TRIAL_ACTIVATION_PENDING_KEY);
    sessionStorage.removeItem(TRIAL_ACTIVATION_PENDING_KEY);
    return v === "1";
  } catch {
    return false;
  }
}
