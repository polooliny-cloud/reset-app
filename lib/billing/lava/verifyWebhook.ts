import { createHmac, timingSafeEqual } from "crypto";

export function verifyLavaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
): boolean {
  if (!secret) {
    console.warn("[billing] LAVA_WEBHOOK_SECRET not set, skipping signature verify");
    return process.env.NODE_ENV !== "production";
  }

  if (!signatureHeader) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signatureHeader.replace(/^sha256=/i, "").trim();

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
  } catch {
    return false;
  }
}
