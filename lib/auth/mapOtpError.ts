import type { AuthError } from "@supabase/supabase-js";

import { DEFAULT_OTP_COOLDOWN_SECONDS, parseCooldownSeconds } from "@/lib/auth/mapAuthError";

export const OTP_MESSAGES = {
  alreadySentWait: "Код уже отправлен. Подождите немного.",
  alreadySentCheck: "Код уже отправлен. Проверьте почту.",
  invalidEmail: "Введите корректную почту",
  network: "Проблема с интернет-соединением",
  generic: "Не удалось отправить код",
  emptyEmail: "Введите email.",
  emptyCode: "Введите код",
  incompleteCode: "Введите 6 цифр",
  invalidCode: "Неверный код",
  expiredCode: "Код истёк. Запросите новый",
  tooManyAttempts: "Слишком много попыток. Попробуйте позже",
  successHint: "Не забудьте проверить спам.",
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
 * Maps Supabase OTP sending errors for the auth form.
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

function isExpiredCodeError(error: AuthError): boolean {
  const msg = error.message?.toLowerCase() ?? "";
  const code = error.code?.toLowerCase() ?? "";
  return (
    code.includes("expired") ||
    msg.includes("expired") ||
    msg.includes("otp expired") ||
    msg.includes("token has expired")
  );
}

function isInvalidCodeError(error: AuthError): boolean {
  const msg = error.message?.toLowerCase() ?? "";
  const code = error.code?.toLowerCase() ?? "";
  return (
    code.includes("otp") ||
    code.includes("token") ||
    msg.includes("token is invalid") ||
    msg.includes("invalid token") ||
    msg.includes("otp") ||
    msg.includes("confirmation token")
  );
}

export function mapVerifyOtpError(
  error: AuthError | null | undefined,
): Pick<MappedOtpError, "message" | "kind"> {
  if (!error) {
    return { message: OTP_MESSAGES.invalidCode, kind: "generic" };
  }

  if (isNetworkError(error)) {
    return { message: OTP_MESSAGES.network, kind: "network" };
  }

  if (isRateLimitLike(error)) {
    return { message: OTP_MESSAGES.tooManyAttempts, kind: "rate_limit" };
  }

  if (isExpiredCodeError(error)) {
    return { message: OTP_MESSAGES.expiredCode, kind: "generic" };
  }

  if (isInvalidCodeError(error)) {
    return { message: OTP_MESSAGES.invalidCode, kind: "generic" };
  }

  return { message: OTP_MESSAGES.invalidCode, kind: "generic" };
}
