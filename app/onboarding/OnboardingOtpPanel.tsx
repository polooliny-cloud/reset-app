"use client";

import { useState, type FormEvent } from "react";

import { useAuth } from "@/lib/auth/useAuth";
import { isValidEmail } from "@/lib/auth/validateEmail";
import { captureEvent } from "@/lib/posthogCapture";

const RESUME_AFTER_AUTH_KEY = "onboarding_resume_after_magic_link";

export function setOnboardingResumeAfterMagicLink() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(RESUME_AFTER_AUTH_KEY, "question");
  } catch {
    // ignore
  }
}

export function clearOnboardingResumeAfterMagicLink() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(RESUME_AFTER_AUTH_KEY);
  } catch {
    // ignore
  }
}

export function peekOnboardingResumeAfterMagicLink(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(RESUME_AFTER_AUTH_KEY);
  } catch {
    return null;
  }
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Назад"
      className="fixed left-4 z-40 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2.5 text-white/80 backdrop-blur-md transition duration-200 ease-out hover:bg-white/10 hover:text-white sm:left-6"
      style={{ top: "calc(16px + env(safe-area-inset-top))" }}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path
          d="M15 18L9 12L15 6"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

type Props = {
  mode: "register" | "login";
  onSwitchToLogin: () => void;
  onSwitchToRegister: () => void;
  onBack: () => void;
};

export function OnboardingOtpPanel({ mode, onSwitchToLogin, onSwitchToRegister, onBack }: Props) {
  const { signInWithOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const trimmed = email.trim();
  const emailOk = isValidEmail(trimmed);
  const canSubmit = emailOk && !submitting && !sent;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!emailOk) {
      setError("Введи корректный email.");
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError("Нет сети. Проверь подключение и попробуй снова.");
      return;
    }

    setSubmitting(true);
    if (mode === "register") {
      captureEvent("auth_register_clicked");
    } else {
      captureEvent("auth_login_clicked");
    }

    const { error: otpError } = await signInWithOtp(trimmed, mode);
    setSubmitting(false);

    if (otpError) {
      setError(otpError);
      return;
    }

    setOnboardingResumeAfterMagicLink();
    captureEvent("magic_link_requested", { mode });
    setSent(true);
  }

  const title =
    mode === "register" ? "Создай свой аккаунт в Reset" : "Рады снова вас видеть";
  const subtitle =
    mode === "register"
      ? "Введи почту, чтобы присоединиться"
      : "Введи почту, чтобы войти";

  return (
    <>
      <BackButton onClick={onBack} />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-2 pb-[calc(16px+env(safe-area-inset-bottom))] pt-[calc(72px+env(safe-area-inset-top))]">
        <div className="surface-card animate-onboarding-step px-5 py-7">
          <p className="text-center text-sm uppercase tracking-[0.18em] text-white/75">Reset</p>
          <h1 className="text-title text-measure mt-6 text-center text-[1.65rem] font-semibold leading-tight text-white sm:text-[1.85rem]">
            {title}
          </h1>
          <p className="text-body text-measure mt-3 text-center text-[15px] leading-relaxed text-[#9A9AA0]">
            {subtitle}
          </p>

          {sent ? (
            <p className="text-body text-measure mt-8 text-center text-[15px] leading-relaxed text-[#C4C4C9]">
              Мы отправили ссылку для входа на твою почту. Перейди по ссылке, чтобы продолжить
              онбординг.
            </p>
          ) : (
            <form onSubmit={(ev) => void handleSubmit(ev)} className="mt-8">
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
                  if (error) setError(null);
                }}
                placeholder="you@example.com"
                disabled={submitting}
                className="glass-input h-12 w-full rounded-2xl px-4 text-base text-white outline-none transition duration-200 ease-out placeholder:text-slate-500 focus:border-violet-300/35 disabled:opacity-60"
              />
              {error ? (
                <p className="text-body text-measure mt-3 text-center text-sm leading-snug text-red-300/95" role="alert">
                  {error}
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
          )}

          <div className="mt-6 text-center">
            {mode === "register" ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSent(false);
                  onSwitchToLogin();
                }}
                className="secondary-link"
              >
                У меня есть аккаунт
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSent(false);
                  onSwitchToRegister();
                }}
                className="secondary-link"
              >
                У меня нет аккаунта
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
