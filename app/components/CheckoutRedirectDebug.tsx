"use client";

type Props = {
  checkoutUrl: string;
  invoiceId?: string;
  orderId?: string;
  resolvedFrom?: string;
  lavaDebug?: Record<string, unknown>;
  onContinue: () => void;
  onCancel: () => void;
};

export function CheckoutRedirectDebug({
  checkoutUrl,
  invoiceId,
  orderId,
  resolvedFrom,
  lavaDebug,
  onContinue,
  onCancel,
}: Props) {
  let host = "";
  try {
    host = new URL(checkoutUrl).hostname;
  } catch {
    host = "(invalid URL)";
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-amber-500/40 bg-[#0c1018] p-5 shadow-2xl"
        role="dialog"
        aria-labelledby="checkout-debug-title"
      >
        <p
          id="checkout-debug-title"
          className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200/90"
        >
          Checkout debug (Lava)
        </p>
        <p className="text-measure mt-2 text-sm text-[#B5B5BA]">
          Проверьте URL перед переходом. Редирект через{" "}
          <code className="text-amber-100">window.location.href</code> (mobile-safe).
        </p>

        <dl className="mt-4 space-y-2 text-xs text-slate-300">
          <div>
            <dt className="text-[#8C8C92]">Host</dt>
            <dd className="font-mono break-all text-white">{host}</dd>
          </div>
          {invoiceId ? (
            <div>
              <dt className="text-[#8C8C92]">invoice_id</dt>
              <dd className="font-mono break-all text-white">{invoiceId}</dd>
            </div>
          ) : null}
          {orderId ? (
            <div>
              <dt className="text-[#8C8C92]">order_id</dt>
              <dd className="font-mono break-all text-white">{orderId}</dd>
            </div>
          ) : null}
          {resolvedFrom ? (
            <div>
              <dt className="text-[#8C8C92]">resolved_from</dt>
              <dd className="font-mono text-emerald-200/90">{resolvedFrom}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-[#8C8C92]">checkout_url</dt>
            <dd className="font-mono break-all text-amber-50">{checkoutUrl}</dd>
          </div>
        </dl>

        {lavaDebug ? (
          <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-white/10 bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-slate-300">
            {JSON.stringify(lavaDebug, null, 2)}
          </pre>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <button type="button" onClick={onContinue} className="primary-cta">
            Перейти к оплате
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-2xl border border-slate-300/15 py-3 text-sm text-[#D4D4D8]"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
