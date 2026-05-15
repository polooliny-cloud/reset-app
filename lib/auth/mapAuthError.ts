import type { AuthError } from "@supabase/supabase-js";

export type AuthErrorKind =
  | "cooldown"
  | "rate_limit"
  | "invalid_email"
  | "network"
  | "generic";

export type MappedAuthError = {
  message: string;
  kind: AuthErrorKind;
  /** Seconds until another OTP request is allowed (from Supabase message when present). */
  cooldownSeconds?: number;
};

export const AUTH_MESSAGES = {
  cooldown: "Подождите немного перед повторной отправкой письма",
  rateLimit: "Слишком много попыток. Попробуйте позже",
  invalidEmail: "Введите корректную почту",
  network: "Нет подключения к интернету. Проверьте сеть и попробуйте снова",
  generic: "Не удалось отправить письмо. Попробуйте позже",
  emptyEmail: "Введите email.",
  linkInvalid: "Ссылка устарела или недействительна. Запросите новое письмо.",
  alreadyRegistered: "Этот email уже зарегистрирован. Используйте вход.",
} as const;

/** Default resend cooldown when Supabase does not return a duration. */
export const DEFAULT_OTP_COOLDOWN_SECONDS = 60;

/** Parses "… after 42 seconds" / "60 seconds" from Supabase auth errors. */
export function parseCooldownSeconds(message: string): number | undefined {
  const lower = message.toLowerCase();
  const afterMatch = lower.match(/after\s+(\d+)\s*seconds?/);
  if (afterMatch) {
    const n = Number(afterMatch[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const secMatch = lower.match(/(\d+)\s*seconds?/);
  if (secMatch) {
    const n = Number(secMatch[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

function isNetworkError(error: AuthError): boolean {
  const msg = error.message?.toLowerCase() ?? "";
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("fetch error") ||
    error.name === "AuthRetryableFetchError"
  );
}

function isCooldownError(error: AuthError): boolean {
  const msg = error.message?.toLowerCase() ?? "";
  return (
    msg.includes("for security purposes") ||
    msg.includes("only request this") ||
    msg.includes("once every") ||
    msg.includes("before requesting another")
  );
}

function isRateLimitError(error: AuthError): boolean {
  const msg = error.message?.toLowerCase() ?? "";
  const code = error.code?.toLowerCase() ?? "";
  return (
    error.status === 429 ||
    msg.includes("too many requests") ||
    msg.includes("rate limit") ||
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
    msg.includes("unable to validate email")
  );
}

/**
 * Maps Supabase Auth errors to short Russian messages.
 * Never exposes raw backend text to the UI.
 */
export function mapAuthError(error: AuthError | null | undefined): MappedAuthError {
  if (!error) {
    return { message: AUTH_MESSAGES.generic, kind: "generic" };
  }

  if (isNetworkError(error)) {
    return { message: AUTH_MESSAGES.network, kind: "network" };
  }

  if (isInvalidEmailError(error)) {
    return { message: AUTH_MESSAGES.invalidEmail, kind: "invalid_email" };
  }

  if (isCooldownError(error)) {
    const parsed = parseCooldownSeconds(error.message ?? "");
    return {
      message: AUTH_MESSAGES.cooldown,
      kind: "cooldown",
      cooldownSeconds: parsed ?? DEFAULT_OTP_COOLDOWN_SECONDS,
    };
  }

  if (isRateLimitError(error)) {
    const parsed = parseCooldownSeconds(error.message ?? "");
    return {
      message: AUTH_MESSAGES.rateLimit,
      kind: "rate_limit",
      cooldownSeconds: parsed ?? DEFAULT_OTP_COOLDOWN_SECONDS,
    };
  }

  const msg = error.message?.toLowerCase() ?? "";
  const code = error.code?.toLowerCase() ?? "";

  if (code === "invalid_grant" || code === "invalid_credentials") {
    return { message: AUTH_MESSAGES.linkInvalid, kind: "generic" };
  }
  if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
    return {
      message: "Подтвердите email по ссылке из письма.",
      kind: "generic",
    };
  }
  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return { message: AUTH_MESSAGES.alreadyRegistered, kind: "generic" };
  }
  if (msg.includes("signup_disabled")) {
    return { message: "Регистрация временно недоступна.", kind: "generic" };
  }
  if (msg.includes("otp") && (msg.includes("expired") || msg.includes("invalid"))) {
    return { message: AUTH_MESSAGES.linkInvalid, kind: "generic" };
  }
  if (msg.includes("user not found") || msg.includes("signups not allowed")) {
    return { message: AUTH_MESSAGES.generic, kind: "generic" };
  }

  return { message: AUTH_MESSAGES.generic, kind: "generic" };
}

/** Convenience for callers that only need the user-facing string. */
export function mapAuthErrorMessage(error: AuthError | null | undefined): string {
  return mapAuthError(error).message;
}
