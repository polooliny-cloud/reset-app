"use client";

import { useCallback, useEffect, useState } from "react";

import { DEFAULT_OTP_COOLDOWN_SECONDS } from "@/lib/auth/mapAuthError";
import { OTP_MESSAGES } from "@/lib/auth/mapOtpError";
import {
  clearOtpCooldownStorage,
  getOtpAuthStep,
  getOtpCooldownRemainingSec,
  getOtpSentEmail,
  persistOtpSent,
  syncOtpCooldownTick,
  type OtpAuthStep,
} from "@/lib/auth/otpCooldownStorage";
import { useAuth } from "@/lib/auth/useAuth";
import { isValidEmail } from "@/lib/auth/validateEmail";
import { isOnboardingCompletedLocally } from "@/lib/onboarding";
import { captureEvent } from "@/lib/posthogCapture";

import { OnboardingOtpBackButton } from "./OnboardingOtpBackButton";
import { OnboardingOtpForm } from "./OnboardingOtpForm";
import { OnboardingOtpSuccess } from "./OnboardingOtpSuccess";

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

type AuthStep = OtpAuthStep;

type Props = {
  mode: "register" | "login";
  onSwitchToLogin: () => void;
  onSwitchToRegister: () => void;
  onBack: () => void;
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
  const [step, setStep] = useState<AuthStep>("form");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldownSec, setCooldownSec] = useState(0);

  const restoreFromStorage = useCallback(() => {
    const storedStep = getOtpAuthStep();
    const storedEmail = getOtpSentEmail();
    const remaining = getOtpCooldownRemainingSec();

    if (storedEmail) {
      setEmail(storedEmail);
    }
    if (remaining > 0) {
      setCooldownSec(remaining);
    }
    if (storedStep === "success" && storedEmail) {
      setStep("success");
    }
  }, []);

  useEffect(() => {
    restoreFromStorage();
  }, [restoreFromStorage]);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const id = window.setInterval(() => {
      setCooldownSec(syncOtpCooldownTick());
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldownSec]);

  function goToSuccess(emailValue: string, cooldownSeconds: number, infoMessage?: string) {
    const sec = Math.max(1, Math.floor(cooldownSeconds));
    setEmail(emailValue);
    setError(null);
    setInfo(infoMessage ?? null);
    setSubmitting(false);
    setResending(false);
    persistOtpSent(emailValue, sec);
    setCooldownSec(sec);
    setStep("success");
  }

  async function sendOtp(emailValue: string, isResend: boolean) {
    const trimmed = emailValue.trim();
    if (!isValidEmail(trimmed)) {
      setError(OTP_MESSAGES.invalidEmail);
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      if (step === "success") {
        setInfo(OTP_MESSAGES.network);
        setError(null);
      } else {
        setError(OTP_MESSAGES.network);
      }
      return;
    }
    if (cooldownSec > 0) return;

    if (isResend) {
      setResending(true);
    } else {
      setSubmitting(true);
      if (mode === "register") {
        captureEvent("auth_register_clicked");
      } else {
        captureEvent("auth_login_clicked");
      }
    }

    setError(null);

    const result = await signInWithOtp(trimmed, mode, {
      emailAlreadySent: step === "success",
    });

    if (result.ok) {
      if (!result.treatAsSuccess) {
        setOnboardingResumeAfterMagicLink();
        captureEvent("magic_link_requested", { mode });
      }
      goToSuccess(
        trimmed,
        result.cooldownSeconds ?? DEFAULT_OTP_COOLDOWN_SECONDS,
        result.treatAsSuccess ? OTP_MESSAGES.alreadySentCheck : undefined,
      );
      return;
    }

    setSubmitting(false);
    setResending(false);
    const message = result.error ?? OTP_MESSAGES.generic;
    if (step === "success") {
      setInfo(message);
      setError(null);
    } else {
      setError(message);
    }
  }

  function handleOpenGmail() {
    window.open("https://mail.google.com", "_blank", "noopener,noreferrer");
  }

  function resetToForm() {
    setStep("form");
    setError(null);
    setInfo(null);
    clearOnboardingResumeAfterMagicLink();
    clearOtpCooldownStorage();
    setCooldownSec(0);
  }

  function handleSwitchToLogin() {
    resetToForm();
    onSwitchToLogin();
  }

  function handleSwitchToRegister() {
    resetToForm();
    onSwitchToRegister();
  }

  const topPadding =
    step === "success"
      ? "pt-[calc(72px+env(safe-area-inset-top))]"
      : hideBack
        ? "pt-[calc(20px+env(safe-area-inset-top))]"
        : "pt-[calc(72px+env(safe-area-inset-top))]";

  return (
    <>
      {step === "form" && !hideBack ? <OnboardingOtpBackButton onClick={onBack} /> : null}
      {step === "success" ? <OnboardingOtpBackButton onClick={() => resetToForm()} /> : null}
      <div
        className={`mx-auto flex w-full max-w-md flex-1 flex-col px-2 pb-[calc(16px+env(safe-area-inset-bottom))] ${topPadding}`}
      >
        {step === "form" ? (
          <OnboardingOtpForm
            mode={mode}
            initialEmail={email}
            submitting={submitting}
            error={error}
            onSubmit={(value) => void sendOtp(value, false)}
            onSwitchToLogin={handleSwitchToLogin}
            onSwitchToRegister={handleSwitchToRegister}
          />
        ) : (
          <OnboardingOtpSuccess
            email={email}
            cooldownSec={cooldownSec}
            infoMessage={info}
            resending={resending}
            onOpenGmail={handleOpenGmail}
            onResend={() => sendOtp(email, true)}
          />
        )}
      </div>
    </>
  );
}
