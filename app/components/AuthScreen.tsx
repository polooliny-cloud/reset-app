"use client";

import { useState, type FormEvent } from "react";

import { useAuth } from "@/lib/auth/useAuth";

type Mode = "login" | "register";

export function AuthScreen() {
  const { signInWithPassword, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Введи email и пароль.");
      return;
    }

    if (mode === "register") {
      if (password.length < 6) {
        setError("Пароль — минимум 6 символов.");
        return;
      }
      if (password !== passwordConfirm) {
        setError("Пароли не совпадают.");
        return;
      }
    }

    setSubmitting(true);

    if (mode === "login") {
      const { error: signInError } = await signInWithPassword(trimmedEmail, password);
      if (signInError) {
        setError(signInError);
      }
      setSubmitting(false);
      return;
    }

    const { error: signUpError, needsEmailConfirmation } = await signUp(trimmedEmail, password);
    if (signUpError) {
      setError(signUpError);
      setSubmitting(false);
      return;
    }

    if (needsEmailConfirmation) {
      setInfo("Проверь почту: перейди по ссылке для подтверждения, затем войди.");
      setPassword("");
      setPasswordConfirm("");
    }

    setSubmitting(false);
  }

  return (
    <main className="app-shell flex min-h-screen flex-col px-4 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pt-6">
        <div className="surface-card p-6 sm:p-8">
          <h1 className="text-flow-heading text-center text-2xl font-semibold text-white">
            Сохрани свой прогресс
          </h1>
          <p className="text-flow mt-3 text-center text-sm text-[#9A9AA0]">
            Войди через email, чтобы сохранить восстановление и доступ к Premium.
          </p>

          <div className="mt-6 flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setInfo(null);
              }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition duration-200 ease-out ${
                mode === "login"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-[#9A9AA0] hover:text-white/90"
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
                setInfo(null);
              }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition duration-200 ease-out ${
                mode === "register"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-[#9A9AA0] hover:text-white/90"
              }`}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-8">
            <label htmlFor="auth-email" className="sr-only">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="you@example.com"
              disabled={submitting}
              className="glass-input h-12 w-full px-4 text-base text-white outline-none transition duration-200 ease-out placeholder:text-slate-500 focus:border-violet-300/40 disabled:opacity-60"
            />

            <label htmlFor="auth-password" className="sr-only">
              Пароль
            </label>
            <input
              id="auth-password"
              type="password"
              name="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              placeholder="Пароль"
              disabled={submitting}
              className="glass-input mt-3 h-12 w-full px-4 text-base text-white outline-none transition duration-200 ease-out placeholder:text-slate-500 focus:border-violet-300/40 disabled:opacity-60"
            />

            {mode === "register" ? (
              <>
                <label htmlFor="auth-password-confirm" className="sr-only">
                  Повтор пароля
                </label>
                <input
                  id="auth-password-confirm"
                  type="password"
                  name="passwordConfirm"
                  autoComplete="new-password"
                  value={passwordConfirm}
                  onChange={(ev) => setPasswordConfirm(ev.target.value)}
                  placeholder="Повтори пароль"
                  disabled={submitting}
                  className="glass-input mt-3 h-12 w-full px-4 text-base text-white outline-none transition duration-200 ease-out placeholder:text-slate-500 focus:border-violet-300/40 disabled:opacity-60"
                />
              </>
            ) : null}

            {error ? (
              <p className="text-flow mt-3 text-center text-sm text-red-300/95" role="alert">
                {error}
              </p>
            ) : null}

            {info ? (
              <p className="text-flow mt-3 text-center text-sm text-[#B8B8C4]" role="status">
                {info}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="primary-cta mt-6 w-full disabled:pointer-events-none disabled:opacity-60"
            >
              {submitting ? "Подождите…" : mode === "login" ? "Войти" : "Зарегистрироваться"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
