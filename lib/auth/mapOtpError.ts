import type { AuthError } from "@supabase/supabase-js";

import { DEFAULT_OTP_COOLDOWN_SECONDS, parseCooldownSeconds } from "@/lib/auth/mapAuthError";

export const OTP_MESSAGES = {
  alreadySentWait: "Письмо уже отправлено. Подождите немного.",
  alreadySentCheck: "Письмо уже отправлено. Проверьте почту.",
  invalidEmail: "Введите корректную почту",
  network: "Проблема с интернет-соединением",
  generic: "Не удалось отправить письмо",
  emptyEmail: "Введите email.",
  successHint: "Мы отправили ссылку для входа на вашу почту",
} as const;

export type OtpErrorKind =
  | "rate_limit"
  | "invalid_email"
  | "network"
  | "generic";

export type MappedOtpError = {
  message: string;
  kind: OtpErrorKind;
  /** Rate limit / cooldown — keep success UI, not error styling. */
  treatAsSuccess: boolean;
  cooldownSeconds?: number;
};

function isNetworkError(error: AuthError): boolean {
  const msg = error.message?.toLowerCase() ?? "";
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("fetch error") ||
    error.name === "AuthRetryableFetchError"
  );
}

function isRateLimitLike(error: AuthError): boolean {
  const msg = error.message?.toLowerCase() ?? "";
  const code = error.code?.toLowerCase() ?? "";
  return (
    error.status === 429 ||
    msg.includes("for security purposes") ||
    msg.includes("security purposes") ||
    msg.includes("too many requests") ||
    msg.includes("rate limit") ||
    msg.includes("only request this") ||
    msg.includes("once every") ||
    msg.includes("before requesting another") ||
    msg.includes("over_email_send_rate_limit") ||
    code.includes("rate")
  );
}

function isInvalidEmailError(error: AuthError): boolean {
  const msg = error.message?.toLowerCase() ?? "";
  const code = error.code?.toLowerCase() ?? "";
  return (
    code === "invalid_email" ||
    msg.includes("email address is invalid") ||
    msg.includes("invalid email") ||
    msg.includes("unable to validate email") ||
    msg.includes("invalid login")
  );
}

/**
 * Maps Supabase OTP / magic-link errors for the auth form.
 * Never returns raw English backend strings.
 */
export function mapOtpError(
  error: AuthError | null | undefined,
  options?: { emailAlreadySent?: boolean },
): MappedOtpError {
  const emailAlreadySent = options?.emailAlreadySent ?? false;

  if (!error) {
    return { message: OTP_MESSAGES.generic, kind: "generic", treatAsSuccess: false };
  }

  if (isNetworkError(error)) {
    return { message: OTP_MESSAGES.network, kind: "network", treatAsSuccess: false };
  }

  if (isInvalidEmailError(error)) {
    return { message: OTP_MESSAGES.invalidEmail, kind: "invalid_email", treatAsSuccess: false };
  }

  if (isRateLimitLike(error)) {
    const parsed = parseCooldownSeconds(error.message ?? "");
    const cooldownSeconds = parsed ?? DEFAULT_OTP_COOLDOWN_SECONDS;
    return {
      message: emailAlreadySent
        ? OTP_MESSAGES.alreadySentCheck
        : OTP_MESSAGES.alreadySentWait,
      kind: "rate_limit",
      treatAsSuccess: true,
      cooldownSeconds,
    };
  }

  return { message: OTP_MESSAGES.generic, kind: "generic", treatAsSuccess: false };
}
