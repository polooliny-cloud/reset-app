import { clearOtpCooldownStorage } from "@/lib/auth/otpCooldownStorage";
import { clearOnboardingPendingAuthSession } from "@/lib/onboarding";

/** Drop OTP / pending-auth UI flags when there is no authenticated session. */
export function clearStaleAuthUiState(): void {
  clearOnboardingPendingAuthSession();
  clearOtpCooldownStorage();
}
