type BillingLogLevel = "info" | "warn" | "error";

/**
 * Production-safe structured billing logs (JSON line, no secrets).
 */
export function billingLog(
  event: string,
  data?: Record<string, unknown>,
  level: BillingLogLevel = "info",
): void {
  const entry = {
    ts: new Date().toISOString(),
    scope: "billing",
    event,
    ...data,
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error("[billing]", line);
    return;
  }
  if (level === "warn") {
    console.warn("[billing]", line);
    return;
  }
  console.log("[billing]", line);
}

/** Keep payment creation logs useful without leaking secrets or full API responses. */
export function sanitizeYookassaPaymentPayload(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const { amount, capture, confirmation, description, metadata } = body;
  const safeConfirmation =
    typeof confirmation === "object" && confirmation
      ? {
          type: (confirmation as { type?: unknown }).type,
          return_url: (confirmation as { return_url?: unknown }).return_url,
        }
      : null;
  return { amount, capture, confirmation: safeConfirmation, description, metadata };
}
