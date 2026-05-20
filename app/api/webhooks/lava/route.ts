import { NextResponse } from "next/server";

import { handleLavaWebhook } from "@/lib/billing/lava/handleWebhook";
import type { LavaWebhookPayload } from "@/lib/billing/lava/types";
import { verifyLavaWebhookSignature } from "@/lib/billing/lava/verifyWebhook";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();

  const signature =
    request.headers.get("x-lava-signature") ??
    request.headers.get("x-signature") ??
    request.headers.get("authorization");

  const valid = verifyLavaWebhookSignature(
    rawBody,
    signature,
    process.env.LAVA_WEBHOOK_SECRET,
  );

  if (!valid) {
    console.error("[billing] lava webhook signature invalid");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: LavaWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LavaWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("[billing] lava webhook received", {
    event: payload.event ?? payload.status,
    invoiceId: payload.invoice_id ?? payload.order_id,
  });

  const result = await handleLavaWebhook(payload);

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Webhook failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
