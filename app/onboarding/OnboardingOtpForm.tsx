"use client";

import { useState, type FormEvent } from "react";

import { OTP_MESSAGES } from "@/lib/auth/mapOtpError";
import { isValidEmail } from "@/lib/auth/validateEmail";

type Props = {
  mode: "register" | "login";
  initialEmail?: string;
  submitting: boolean;
  error: string | null;
  onSubmit: (email: string) => void;
  onSwitchToLogin: () => void;
  onSwitchToRegister: () => void;
};

export function OnboardingOtpForm({
  mode,
  initialEmail = "",
  submitting,
  error,
  onSubmit,
  onSwitchToLogin,
  onSwitchToRegister,
}: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [localError, setLocalError] = useState<string | null>(null);

  const trimmed = email.trim();
  const emailOk = isValidEmail(trimmed);
  const canSubmit = emailOk && !submitting;
  const displayError = error ?? localError;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!emailOk) {
      setLocalError(OTP_MESSAGES.invalidEmail);
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setLocalError(OTP_MESSAGES.network);
      return;
    }
    onSubmit(trimmed);
  }

  const title =
    mode === "register" ? "Создай свой аккаунт в Reset" : "Рады снова вас видеть";
  const subtitle =
    mode === "register"
      ? "Введи почту, чтобы присоединиться"
      : "Введи почту, чтобы войти";

  return (
    <div className="surface-card animate-onboarding-step px-5 py-7">
      <p className="text-center text-sm uppercase tracking-[0.18em] text-white/75">Reset</p>
      <h1 className="text-title text-measure mt-6 text-center text-[1.65rem] font-semibold leading-tight text-white sm:text-[1.85rem]">
        {title}
      </h1>
      <p className="text-body text-measure mt-3 text-center text-[15px] leading-relaxed text-[#9A9AA0]">
        {subtitle}
      </p>

      <form
        onSubmit={(ev) => void handleSubmit(ev)}
        className="mt-8"
        action="#"
        method="get"
        noValidate
      >
        <label htmlFor="onb-auth-email" className="sr-only">
          Email
        </label>
        <input
          id="onb-auth-email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(ev) => {
            setEmail(ev.target.value);
            if (localError) setLocalError(null);
          }}
          placeholder="you@example.com"
          disabled={submitting}
          className="glass-input h-12 w-full rounded-2xl px-4 text-base text-white outline-none transition duration-200 ease-out placeholder:text-slate-500 focus:border-violet-300/35 disabled:opacity-60"
        />
        {displayError ? (
          <p
            className="text-body text-measure mt-3 text-center text-sm leading-snug text-red-300/95"
            role="alert"
          >
            {displayError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`primary-cta mt-6 ${
            canSubmit
              ? ""
              : "cursor-not-allowed border-slate-400/20 bg-slate-900/60 text-white/45 hover:brightness-100"
          }`}
        >
          {submitting ? "Отправка…" : "Получить письмо"}
        </button>
      </form>

      <div className="mt-6 text-center">
        {mode === "register" ? (
          <button type="button" onClick={onSwitchToLogin} className="secondary-link">
            У меня есть аккаунт
          </button>
        ) : (
          <button type="button" onClick={onSwitchToRegister} className="secondary-link">
            У меня нет аккаунта
          </button>
        )}
      </div>
    </div>
  );
}
