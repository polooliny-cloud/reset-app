import { recordWebhookTrace } from "@/lib/billing/devWebhookTrace";
import { planAmountKopecks } from "@/lib/billing/lava/createCheckout";
import { handleLavaWebhook } from "@/lib/billing/lava/handleWebhook";
import type { LavaCheckoutPlan } from "@/lib/billing/lava/types";
import { billingLog } from "@/lib/billing/log";
import { createAdminClient } from "@/lib/supabase/admin";

export type SimulateWebhookResult =
  | { ok: true; invoiceId: string; duplicate?: boolean }
  | { ok: false; error: string };

/**
 * Runs the same path as a successful Lava webhook (for dev/staging verification).
 */
export async function simulateWebhookSuccess(input: {
  userId: string;
  plan: LavaCheckoutPlan;
  providerInvoiceId?: string;
}): Promise<SimulateWebhookResult> {
  const admin = createAdminClient();
  const plan = input.plan;
  let invoiceId = input.providerInvoiceId;

  if (!invoiceId) {
    const { data: pending } = await admin
      .from("payments")
      .select("provider_invoice_id")
      .eq("user_id", input.userId)
      .eq("provider", "lava")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    invoiceId = pending?.provider_invoice_id ?? `dev_mock_${input.userId}_${Date.now()}`;
  }

  const orderId = `dev_order_${input.userId}_${Date.now()}`;
  const amountRub = planAmountKopecks(plan) / 100;

  billingLog("dev_mock_webhook_start", {
    userId: input.userId,
    plan,
    invoiceId,
    orderId,
  });

  const payload = {
    invoice_id: invoiceId,
    order_id: orderId,
    status: "success",
    amount: amountRub,
    custom_fields: JSON.stringify({ user_id: input.userId, plan }),
    pay_time: new Date().toISOString().replace("T", " ").slice(0, 19),
  };

  const result = await handleLavaWebhook(payload);

  recordWebhookTrace({
    receivedAt: new Date().toISOString(),
    signatureValid: true,
    status: payload.status,
    invoiceId,
    orderId,
    userId: result.userId ?? input.userId,
    plan: result.plan ?? plan,
    activationOk: result.ok && !result.ignored,
    duplicate: Boolean(result.duplicate),
    error: result.ok ? null : (result.error ?? "unknown"),
    payloadPreview: payload,
  });

  if (!result.ok) {
    return { ok: false, error: result.error ?? "Activation failed" };
  }

  return { ok: true, invoiceId };
}
