"use client";

import { useEffect, useState, type FormEvent } from "react";

import { AUTH_MESSAGES, DEFAULT_OTP_COOLDOWN_SECONDS } from "@/lib/auth/mapAuthError";
import { formatCooldownMmSs } from "@/lib/auth/otpCooldown";
import { useAuth } from "@/lib/auth/useAuth";
import { isValidEmail } from "@/lib/auth/validateEmail";
import { isOnboardingCompletedLocally } from "@/lib/onboarding";
import { captureEvent } from "@/lib/posthogCapture";

const RESUME_AFTER_AUTH_KEY = "onboarding_resume_after_magic_link";

/** After magic link: `home` → main app; `question` → onboarding questions. */
export function setOnboardingResumeAfterMagicLink() {
  if (typeof window === "undefined") return;
  try {
    const target = isOnboardingCompletedLocally() ? "home" : "question";
    window.sessionStorage.setItem(RESUME_AFTER_AUTH_KEY, target);
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

function resetAuthUiState(
  setError: (v: string | null) => void,
  setSent: (v: boolean) => void,
  setCooldownSec: (v: number) => void,
) {
  setError(null);
  setSent(false);
  setCooldownSec(0);
}

type Props = {
  mode: "register" | "login";
  onSwitchToLogin: () => void;
  onSwitchToRegister: () => void;
  onBack: () => void;
  /** True when user already finished onboarding — no back to welcome. */
  hideBack?: boolean;
};

export function OnboardingOtpPanel({
  mode,
  onSwitchToLogin,
  onSwitchToRegister,
  onBack,
  hideBack = false,
}: Props) {
  const { signInWithOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);

  const trimmed = email.trim();
  const emailOk = isValidEmail(trimmed);
  const onCooldown = cooldownSec > 0;
  const canSubmit = emailOk && !submitting && !onCooldown;

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const id = window.setInterval(() => {
      setCooldownSec((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldownSec]);

  function startCooldown(seconds: number) {
    const next = Math.max(1, Math.floor(seconds));
    setCooldownSec(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!emailOk) {
      setError(AUTH_MESSAGES.invalidEmail);
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError(AUTH_MESSAGES.network);
      return;
    }
    if (onCooldown) return;

    setSubmitting(true);
    if (mode === "register") {
      captureEvent("auth_register_clicked");
    } else {
      captureEvent("auth_login_clicked");
    }

    const { error: otpError, cooldownSeconds } = await signInWithOtp(trimmed, mode);
    setSubmitting(false);

    if (otpError) {
      setError(otpError);
      if (cooldownSeconds) {
        startCooldown(cooldownSeconds);
      }
      return;
    }

    setOnboardingResumeAfterMagicLink();
    captureEvent("magic_link_requested", { mode });
    setSent(true);
    startCooldown(DEFAULT_OTP_COOLDOWN_SECONDS);
  }

  function submitButtonLabel(): string {
    if (submitting) return "Отправка…";
    if (onCooldown) {
      return `Повторная отправка через ${formatCooldownMmSs(cooldownSec)}`;
    }
    if (sent) return "Отправить письмо снова";
    return "Получить письмо";
  }

  const title =
    mode === "register" ? "Создай свой аккаунт в Reset" : "Рады снова вас видеть";
  const subtitle =
    mode === "register"
      ? "Введи почту, чтобы присоединиться"
      : "Введи почту, чтобы войти";

  return (
    <>
      {hideBack ? null : <BackButton onClick={onBack} />}
      <div
        className={`mx-auto flex w-full max-w-md flex-1 flex-col px-2 pb-[calc(16px+env(safe-area-inset-bottom))] ${
          hideBack
            ? "pt-[calc(20px+env(safe-area-inset-top))]"
            : "pt-[calc(72px+env(safe-area-inset-top))]"
        }`}
      >
        <div className="surface-card animate-onboarding-step px-5 py-7">
          <p className="text-center text-sm uppercase tracking-[0.18em] text-white/75">Reset</p>
          <h1 className="text-title text-measure mt-6 text-center text-[1.65rem] font-semibold leading-tight text-white sm:text-[1.85rem]">
            {title}
          </h1>
          <p className="text-body text-measure mt-3 text-center text-[15px] leading-relaxed text-[#9A9AA0]">
            {subtitle}
          </p>

          {sent ? (
            <p
              className="text-body text-measure mt-8 text-center text-[15px] font-medium leading-relaxed text-[#C4C4C9]"
              role="status"
            >
              Письмо отправлено
            </p>
          ) : null}

          {sent ? (
            <p className="text-body text-measure mt-3 text-center text-[15px] leading-relaxed text-[#9A9AA0]">
              Мы отправили ссылку для входа на вашу почту. Перейдите по ссылке, чтобы продолжить.
            </p>
          ) : null}

          <form
            onSubmit={(ev) => void handleSubmit(ev)}
            className={sent ? "mt-6" : "mt-8"}
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
                if (error) setError(null);
              }}
              placeholder="you@example.com"
              disabled={submitting}
              className="glass-input h-12 w-full rounded-2xl px-4 text-base text-white outline-none transition duration-200 ease-out placeholder:text-slate-500 focus:border-violet-300/35 disabled:opacity-60"
            />
            {error ? (
              <p
                className="text-body text-measure mt-3 text-center text-sm leading-snug text-red-300/95"
                role="alert"
              >
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
              {submitButtonLabel()}
            </button>
          </form>

          <div className="mt-6 text-center">
            {mode === "register" ? (
              <button
                type="button"
                onClick={() => {
                  resetAuthUiState(setError, setSent, setCooldownSec);
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
                  resetAuthUiState(setError, setSent, setCooldownSec);
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
