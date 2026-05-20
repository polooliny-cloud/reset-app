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

/** Redact signature / secrets from Lava request bodies for logs. */
export function sanitizeLavaInvoicePayload(
  body: Record<string, string | number>,
): Record<string, string | number> {
  const { shopId, orderId, sum, customFields, successUrl, failUrl, hookUrl, expire, comment } =
    body;
  return { shopId, orderId, sum, customFields, successUrl, failUrl, hookUrl, expire, comment };
}
