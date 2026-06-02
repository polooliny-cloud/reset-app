import { clearOtpCooldownStorage } from "@/lib/auth/otpCooldownStorage";
import { clearOnboardingPendingAuthSession } from "@/lib/onboarding";

/** Drop OTP / pending-auth UI flags when a real session exists or after sign-out cleanup. */
export function clearStaleAuthUiState(): void {
  clearOnboardingPendingAuthSession();
  clearOtpCooldownStorage();
}
