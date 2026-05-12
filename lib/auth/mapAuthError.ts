import type { AuthError } from "@supabase/supabase-js";

/**
 * Maps Supabase Auth errors to short Russian messages for the UI.
 * Does not log or expose raw credentials.
 */
export function mapAuthError(error: AuthError | null | undefined): string {
  if (!error) return "Что-то пошло не так. Попробуй ещё раз.";

  const code = error.code;
  const msg = error.message?.toLowerCase() ?? "";

  if (code === "invalid_credentials" || code === "invalid_grant") {
    return "Неверный email или пароль.";
  }
  if (error.status === 400 && msg.includes("invalid login")) {
    return "Неверный email или пароль.";
  }
  if (error.status === 400 && (msg.includes("invalid") || msg.includes("credentials"))) {
    return "Неверный email или пароль.";
  }
  if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
    return "Подтверди email по ссылке из письма, затем войди.";
  }
  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return "Этот email уже зарегистрирован. Войди или восстанови пароль.";
  }
  if (msg.includes("password") && msg.includes("least")) {
    return "Пароль слишком короткий. Минимум 6 символов.";
  }
  if (msg.includes("signup_disabled")) {
    return "Регистрация временно недоступна.";
  }
  if (msg.includes("rate limit")) {
    return "Слишком много попыток. Подожди немного.";
  }

  return error.message || "Что-то пошло не так. Попробуй ещё раз.";
}
