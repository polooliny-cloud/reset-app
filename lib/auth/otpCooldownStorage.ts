const COOLDOWN_UNTIL_KEY = "reset_otp_cooldown_until";
const SENT_EMAIL_KEY = "reset_otp_sent_email";
const AUTH_STEP_KEY = "reset_otp_auth_step";

export type OtpAuthStep = "form" | "success";

export function getOtpCooldownRemainingSec(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(COOLDOWN_UNTIL_KEY);
    if (!raw) return 0;
    const until = Number(raw);
    if (!Number.isFinite(until)) return 0;
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  } catch {
    return 0;
  }
}

export function getOtpSentEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SENT_EMAIL_KEY);
  } catch {
    return null;
  }
}

export function persistOtpSent(email: string, cooldownSeconds: number): void {
  if (typeof window === "undefined") return;
  try {
    const until = Date.now() + cooldownSeconds * 1000;
    localStorage.setItem(COOLDOWN_UNTIL_KEY, String(until));
    localStorage.setItem(SENT_EMAIL_KEY, email.trim().toLowerCase());
    localStorage.setItem(AUTH_STEP_KEY, "success");
  } catch {
    // ignore
  }
}

export function getOtpAuthStep(): OtpAuthStep {
  if (typeof window === "undefined") return "form";
  try {
    const step = localStorage.getItem(AUTH_STEP_KEY);
    const email = localStorage.getItem(SENT_EMAIL_KEY);
    if (step === "success" && email) return "success";
    return "form";
  } catch {
    return "form";
  }
}

export function clearOtpCooldownStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(COOLDOWN_UNTIL_KEY);
    localStorage.removeItem(SENT_EMAIL_KEY);
    localStorage.removeItem(AUTH_STEP_KEY);
  } catch {
    // ignore
  }
}

export function syncOtpCooldownTick(): number {
  const remaining = getOtpCooldownRemainingSec();
  if (remaining <= 0) {
    try {
      localStorage.removeItem(COOLDOWN_UNTIL_KEY);
    } catch {
      // ignore
    }
  }
  return remaining;
}
