"use client";

import { useEffect, useState } from "react";

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
import { captureEvent } from "@/lib/posthogCapture";

import { OnboardingOtpBackButton } from "./OnboardingOtpBackButton";
import { OnboardingOtpForm } from "./OnboardingOtpForm";
import { OnboardingOtpSuccess } from "./OnboardingOtpSuccess";

type AuthStep = OtpAuthStep;

function getInitialOtpState(): {
  step: AuthStep;
  email: string;
  cooldownSec: number;
} {
  const email = getOtpSentEmail() ?? "";
  const cooldownSec = getOtpCooldownRemainingSec();
  const step = getOtpAuthStep() === "code" && email ? "code" : "form";
  return { step, email, cooldownSec };
}

type Props = {
  mode: "register" | "login";
  onSwitchToLogin: () => void;
  onSwitchToRegister: () => void;
  onBack: () => void;
  hideBack?: boolean;
  onVerified?: () => void;
};

export function OnboardingOtpPanel({
  mode,
  onSwitchToLogin,
  onSwitchToRegister,
  onBack,
  hideBack = false,
  onVerified,
}: Props) {
  const { signInWithOtp, verifyOtpCode } = useAuth();
  const [initialOtpState] = useState(getInitialOtpState);
  const [step, setStep] = useState<AuthStep>(initialOtpState.step);
  const [email, setEmail] = useState(initialOtpState.email);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSec, setCooldownSec] = useState(initialOtpState.cooldownSec);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const id = window.setInterval(() => {
      setCooldownSec(syncOtpCooldownTick());
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldownSec]);

  function showCodeStep(emailValue: string, cooldownSeconds: number) {
    const sec = Math.max(1, Math.floor(cooldownSeconds));
    setEmail(emailValue);
    setCode("");
    setError(null);
    setSubmitting(false);
    setResending(false);
    persistOtpSent(emailValue, sec);
    setCooldownSec(sec);
    setStep("code");
  }

  async function sendOtp(emailValue: string, isResend: boolean) {
    const trimmed = emailValue.trim();
    if (!isValidEmail(trimmed)) {
      setError(OTP_MESSAGES.invalidEmail);
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError(OTP_MESSAGES.network);
      return;
    }
    if (cooldownSec > 0 && isResend) return;
    if (submitting || resending || verifying) return;

    if (isResend) {
      setResending(true);
    } else {
      setSubmitting(true);
      captureEvent(mode === "register" ? "auth_register_clicked" : "auth_login_clicked");
    }

    setError(null);

    const result = await signInWithOtp(trimmed, mode, {
      emailAlreadySent: step === "code",
    });

    if (result.ok) {
      captureEvent("otp_code_requested", { mode, resend: isResend });
      showCodeStep(
        trimmed,
        result.cooldownSeconds ?? DEFAULT_OTP_COOLDOWN_SECONDS,
      );
      return;
    }

    setSubmitting(false);
    setResending(false);
    setError(result.error ?? OTP_MESSAGES.generic);
  }

  async function verifyCode() {
    if (verifying) return;

    const normalized = code.replace(/\D/g, "");
    if (!normalized) {
      setError(OTP_MESSAGES.emptyCode);
      return;
    }
    if (normalized.length < 6) {
      setError(OTP_MESSAGES.incompleteCode);
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError(OTP_MESSAGES.network);
      return;
    }

    setVerifying(true);
    setError(null);

    const result = await verifyOtpCode(email, normalized);

    setVerifying(false);

    if (!result.ok) {
      setError(result.error ?? OTP_MESSAGES.invalidCode);
      return;
    }

    captureEvent("auth_success");
    clearOtpCooldownStorage();
    onVerified?.();
  }

  function resetToForm() {
    setStep("form");
    setCode("");
    setError(null);
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
    step === "code"
      ? "pt-[calc(72px+env(safe-area-inset-top))]"
      : hideBack
        ? "pt-[calc(20px+env(safe-area-inset-top))]"
        : "pt-[calc(72px+env(safe-area-inset-top))]";

  return (
    <>
      {step === "form" && !hideBack ? <OnboardingOtpBackButton onClick={onBack} /> : null}
      {step === "code" ? <OnboardingOtpBackButton onClick={() => resetToForm()} /> : null}
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
            code={code}
            cooldownSec={cooldownSec}
            error={error}
            verifying={verifying}
            resending={resending}
            onCodeChange={(value) => {
              setCode(value);
              if (error) setError(null);
            }}
            onVerify={() => void verifyCode()}
            onResend={() => void sendOtp(email, true)}
          />
        )}
      </div>
    </>
  );
}
