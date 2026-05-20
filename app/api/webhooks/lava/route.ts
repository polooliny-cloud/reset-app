import { NextResponse } from "next/server";

import { recordWebhookTrace } from "@/lib/billing/devWebhookTrace";
import { billingLog } from "@/lib/billing/log";
import { handleLavaWebhook } from "@/lib/billing/lava/handleWebhook";
import type { LavaWebhookPayload } from "@/lib/billing/lava/types";
import { verifyLavaWebhookSignature } from "@/lib/billing/lava/verifyWebhook";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();

  billingLog("webhook_received", {
    contentLength: rawBody.length,
  });

  const signature =
    request.headers.get("authorization") ??
    request.headers.get("x-lava-signature") ??
    request.headers.get("x-signature");

  const valid = verifyLavaWebhookSignature(
    rawBody,
    signature,
    process.env.LAVA_WEBHOOK_SECRET,
  );

  billingLog(valid ? "webhook_signature_valid" : "webhook_signature_invalid", {
    hasSignature: Boolean(signature),
  });

  if (!valid) {
    recordWebhookTrace({
      receivedAt: new Date().toISOString(),
      signatureValid: false,
      status: null,
      invoiceId: null,
      orderId: null,
      userId: null,
      plan: null,
      activationOk: false,
      duplicate: false,
      error: "Invalid signature",
      payloadPreview: {},
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: LavaWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LavaWebhookPayload;
  } catch {
    billingLog("webhook_invalid_json", {}, "error");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await handleLavaWebhook(payload);

  recordWebhookTrace({
    receivedAt: new Date().toISOString(),
    signatureValid: true,
    status: payload.status ?? payload.event ?? null,
    invoiceId: payload.invoice_id ?? null,
    orderId: payload.order_id ?? null,
    userId: result.userId ?? null,
    plan: result.plan ?? null,
    activationOk: result.ok && !result.ignored,
    duplicate: Boolean(result.duplicate),
    error: result.ok ? null : (result.error ?? "unknown"),
    payloadPreview: {
      invoice_id: payload.invoice_id,
      order_id: payload.order_id,
      status: payload.status,
      amount: payload.amount,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Webhook failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    duplicate: result.duplicate ?? false,
    ignored: result.ignored ?? false,
  });
}
