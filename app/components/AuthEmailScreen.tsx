"use client";

import { useState } from "react";

import { supabase } from "@/lib/supabase";

export function AuthEmailScreen() {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"form" | "submitting" | "sent">("form");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Введи email.");
      return;
    }

    setError(null);
    setPhase("submitting");

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/` : undefined;

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
      },
    });

    if (otpError) {
      setError(otpError.message);
      setPhase("form");
      return;
    }

    setPhase("sent");
  }

  return (
    <main className="app-shell flex min-h-screen flex-col px-4 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pt-6">
        {phase === "sent" ? (
          <div className="surface-card p-6 sm:p-8">
            <p className="text-flow text-center text-base text-[#E8E8EC]">
              Мы отправили ссылку для входа на твою почту.
            </p>
          </div>
        ) : (
          <div className="surface-card p-6 sm:p-8">
            <h1 className="text-flow-heading text-center text-2xl font-semibold text-white">
              Сохрани свой прогресс
            </h1>
            <p className="text-flow mt-3 text-center text-sm text-[#9A9AA0]">
              Войди через email, чтобы сохранить восстановление и доступ к Premium.
            </p>

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
                disabled={phase === "submitting"}
                className="glass-input h-12 w-full px-4 text-base text-white outline-none transition duration-200 ease-out placeholder:text-slate-500 focus:border-violet-300/40 disabled:opacity-60"
              />

              {error ? (
                <p className="text-flow mt-3 text-center text-sm text-red-300/95" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={phase === "submitting"}
                className="primary-cta mt-6 w-full disabled:pointer-events-none disabled:opacity-60"
              >
                {phase === "submitting" ? "Отправка…" : "Продолжить"}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
