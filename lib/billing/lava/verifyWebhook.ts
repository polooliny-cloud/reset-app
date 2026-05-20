import { createHmac, timingSafeEqual } from "crypto";

function normalizeSignature(value: string): string {
  return value.replace(/^sha256=/i, "").trim();
}

export function verifyLavaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
): boolean {
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[lava] LAVA_WEBHOOK_SECRET not set in production");
      return false;
    }
    console.warn("[lava] LAVA_WEBHOOK_SECRET not set, skipping signature verify (dev only)");
    return true;
  }

  if (!signatureHeader) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = normalizeSignature(signatureHeader);

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
  } catch {
    return false;
  }
}
