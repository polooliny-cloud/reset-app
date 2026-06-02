"use client";

type Props = {
  confirmationUrl: string;
  paymentId?: string;
  orderId?: string;
  onContinue: () => void;
  onCancel: () => void;
};

export function PaymentRedirectSheet({
  confirmationUrl,
  paymentId,
  orderId,
  onContinue,
  onCancel,
}: Props) {
  let host = "ЮKassa";
  try {
    host = new URL(confirmationUrl).hostname;
  } catch {
    // keep default
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div
        className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0b1018]/95 p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-redirect-title"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-violet-300/20 bg-violet-500/10">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200/25 border-t-violet-100" />
        </div>

        <p className="mt-5 text-center text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-violet-200/80">
          Reset+
        </p>
        <h2 id="payment-redirect-title" className="mt-2 text-center text-xl font-semibold text-white">
          Всё готово к оплате
        </h2>
        <p className="text-measure mt-3 text-center text-sm leading-relaxed text-[#A8A8AE]">
          Сейчас вы перейдёте на защищённую страницу ЮKassa. Premium активируется автоматически
          после подтверждения платежа.
        </p>

        <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-[#8C8C92]">
          <p>
            Провайдер: <span className="text-[#D4D4D8]">{host}</span>
          </p>
          {paymentId ? (
            <p className="mt-1 break-all">
              Payment ID: <span className="font-mono text-[#D4D4D8]">{paymentId}</span>
            </p>
          ) : null}
          {orderId ? (
            <p className="mt-1 break-all">
              Order ID: <span className="font-mono text-[#D4D4D8]">{orderId}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <button type="button" onClick={onContinue} className="primary-cta">
            Перейти к оплате
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-2xl border border-slate-300/15 bg-slate-900/40 py-3 text-sm font-medium text-[#D4D4D8] transition duration-200 ease-out hover:bg-slate-800/50"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
