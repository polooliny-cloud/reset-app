import { createHmac } from "crypto";

/** HMAC-SHA256 hex signature for Lava Business API (body = raw JSON string). */
export function signLavaRequestBody(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}
