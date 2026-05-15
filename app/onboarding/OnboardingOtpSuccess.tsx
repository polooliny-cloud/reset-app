"use client";

import { OTP_MESSAGES } from "@/lib/auth/mapOtpError";
import { formatCooldownSeconds } from "@/lib/auth/otpCooldown";

type Props = {
  email: string;
  cooldownSec: number;
  infoMessage: string | null;
  resending: boolean;
  onOpenGmail: () => void;
  onResend: () => void;
};

export function OnboardingOtpSuccess({
  email,
  cooldownSec,
  infoMessage,
  resending,
  onOpenGmail,
  onResend,
}: Props) {
  const onCooldown = cooldownSec > 0;
  const canResend = !onCooldown && !resending;

  return (
    <div className="surface-card animate-onboarding-step px-5 py-7">
      <p className="text-center text-sm uppercase tracking-[0.18em] text-white/75">Reset</p>
      <h1 className="text-title text-measure mt-6 text-center text-[1.65rem] font-semibold leading-tight text-white sm:text-[1.85rem]">
        Проверь почту
      </h1>
      <p className="text-body text-measure mt-3 text-center text-[15px] leading-relaxed text-[#9A9AA0]">
        Мы отправили ссылку для входа на{" "}
        <span className="break-all font-medium text-[#C4C4C9]">{email}</span>
      </p>

      {infoMessage ? (
        <p
          className="text-body text-measure mt-4 text-center text-sm leading-snug text-[#C4C4C9]"
          role="status"
        >
          {infoMessage}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3">
        <button type="button" onClick={onOpenGmail} className="primary-cta">
          Открыть Gmail
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
              ? `Повторить через ${formatCooldownSeconds(cooldownSec)}`
              : "Отправить ещё раз"}
        </button>
      </div>

      <p className="text-body text-measure mt-6 text-center text-[14px] leading-relaxed text-[#8C8C92]">
        {OTP_MESSAGES.successHint}
      </p>
    </div>
  );
}
