"use client";

import { useEffect, useRef, type ChangeEvent, type ClipboardEvent, type FormEvent } from "react";

import { OTP_MESSAGES } from "@/lib/auth/mapOtpError";
import { formatCooldownSeconds } from "@/lib/auth/otpCooldown";

type Props = {
  email: string;
  code: string;
  cooldownSec: number;
  error: string | null;
  verifying: boolean;
  resending: boolean;
  onCodeChange: (code: string) => void;
  onVerify: () => void;
  onResend: () => void;
};

const OTP_LENGTH = 6;

function normalizeCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function OnboardingOtpSuccess({
  email,
  code,
  cooldownSec,
  error,
  verifying,
  resending,
  onCodeChange,
  onVerify,
  onResend,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onCooldown = cooldownSec > 0;
  const canResend = !onCooldown && !resending && !verifying;
  const codeComplete = code.length === OTP_LENGTH;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    onCodeChange(normalizeCode(event.target.value));
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = normalizeCode(event.clipboardData.getData("text"));
    if (!pasted) return;
    event.preventDefault();
    onCodeChange(pasted);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onVerify();
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card animate-onboarding-step px-5 py-7">
      <p className="text-center text-sm uppercase tracking-[0.18em] text-white/75">Reset</p>
      <h1 className="text-title text-measure mt-6 text-center text-[1.65rem] font-semibold leading-tight text-white sm:text-[1.85rem]">
        Мы отправили код на почту
      </h1>
      <div className="text-body text-measure mt-3 text-center text-[15px] leading-relaxed text-[#9A9AA0]">
        <p className="break-all text-sm text-[#9A9AA0]">{email}</p>
      </div>

      <div className="relative mt-8" onClick={() => inputRef.current?.focus()}>
        <label htmlFor="onb-auth-code" className="sr-only">
          Код из письма
        </label>
        <input
          ref={inputRef}
          id="onb-auth-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          value={code}
          onChange={handleInputChange}
          onPaste={handlePaste}
          disabled={verifying}
          aria-invalid={!!error}
          aria-describedby={error ? "onb-auth-code-error" : undefined}
          className="absolute inset-0 h-full w-full opacity-0"
        />
        <div className="grid grid-cols-6 gap-2 sm:gap-3" aria-hidden>
          {Array.from({ length: OTP_LENGTH }).map((_, index) => {
            const digit = code[index] ?? "";
            const active = index === code.length && !codeComplete;
            return (
              <div
                key={index}
                className={`flex h-[3.25rem] items-center justify-center rounded-2xl border text-xl font-semibold tabular-nums transition duration-150 sm:h-14 ${
                  error
                    ? "border-red-300/45 bg-red-500/[0.06] text-red-100"
                    : active
                      ? "border-violet-300/55 bg-violet-300/[0.08] text-white shadow-[0_0_24px_rgba(167,139,250,0.10)]"
                      : "border-white/10 bg-white/[0.04] text-white"
                }`}
              >
                {digit}
              </div>
            );
          })}
        </div>
      </div>

      {error ? (
        <p
          id="onb-auth-code-error"
          className="text-body text-measure mt-4 text-center text-sm leading-snug text-red-300/95"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3">
        <button
          type="submit"
          disabled={!codeComplete || verifying || resending}
          className={`primary-cta ${
            codeComplete && !verifying && !resending
              ? ""
              : "cursor-not-allowed border-slate-400/20 bg-slate-900/60 text-white/45 hover:brightness-100"
          }`}
        >
          {verifying ? "Проверяем…" : "Подтвердить"}
        </button>
        <button
          type="button"
          onClick={() => void onResend()}
          disabled={!canResend}
          className={`primary-cta ${
            canResend
              ? ""
              : "cursor-not-allowed border-slate-400/20 bg-slate-900/60 text-white/45 hover:brightness-100"
          }`}
        >
          {resending
            ? "Отправка…"
            : onCooldown
              ? `Отправить повторно через ${formatCooldownSeconds(cooldownSec)}`
              : "Отправить ещё раз"}
        </button>
      </div>

      <p className="text-body text-measure mt-6 text-center text-[14px] leading-relaxed text-[#8C8C92]">
        {OTP_MESSAGES.successHint}
      </p>
    </form>
  );
}
