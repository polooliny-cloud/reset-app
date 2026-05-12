import type { AuthError } from "@supabase/supabase-js";

/**
 * Maps Supabase Auth errors to short Russian messages (magic link / OTP only).
 * Does not log or expose raw credentials.
 */
export function mapAuthError(error: AuthError | null | undefined): string {
  if (!error) return "Что-то пошло не так. Попробуй ещё раз.";

  const code = error.code;
  const msg = error.message?.toLowerCase() ?? "";

  if (code === "invalid_grant" || code === "invalid_credentials") {
    return "Ссылка или код недействительны. Запроси новое письмо.";
  }
  if (error.status === 400 && (msg.includes("invalid") || msg.includes("credentials"))) {
    return "Не удалось подтвердить вход. Запроси новое письмо.";
  }
  if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
    return "Подтверди email по ссылке из письма.";
  }
  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return "Этот email уже зарегистрирован. Используй вход.";
  }
  if (msg.includes("signup_disabled")) {
    return "Регистрация временно недоступна.";
  }
  if (msg.includes("rate limit")) {
    return "Слишком много попыток. Подожди немного.";
  }
  if (msg.includes("otp") && (msg.includes("expired") || msg.includes("invalid"))) {
    return "Ссылка устарела или недействительна. Запроси новое письмо.";
  }
  if (msg.includes("email address is invalid") || code === "invalid_email") {
    return "Некорректный email.";
  }
  if (msg.includes("user not found") || msg.includes("signups not allowed")) {
    return "Не удалось отправить письмо. Проверь email или попробуй позже.";
  }

  return error.message || "Что-то пошло не так. Попробуй ещё раз.";
}
