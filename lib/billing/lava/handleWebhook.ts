import { activatePaidSubscription } from "@/lib/billing/activateSubscription";
import type { LavaWebhookPayload } from "@/lib/billing/lava/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function handleLavaWebhook(
  payload: LavaWebhookPayload,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();

  const status = (payload.status ?? payload.event ?? "").toLowerCase();
  const isPaid = status.includes("paid") || status.includes("success");

  if (!isPaid) {
    console.log("[billing] webhook ignored (non-paid status)", status);
    return { ok: true };
  }

  const userId =
    payload.custom_fields?.user_id ??
    (payload.metadata?.user_id as string | undefined) ??
    payload.order_id;

  const invoiceId = payload.invoice_id ?? payload.order_id;
  const plan = (payload.custom_fields?.plan ??
    payload.metadata?.plan ??
    "monthly") as "monthly" | "yearly" | "lifetime";

  if (!userId || !invoiceId) {
    console.error("[billing] webhook missing userId or invoiceId", payload);
    return { ok: false, error: "Invalid webhook payload" };
  }

  const amount = Number(payload.amount ?? 0);
  const currency = String(payload.currency ?? "RUB");

  const result = await activatePaidSubscription(admin, {
    userId,
    plan,
    providerInvoiceId: String(invoiceId),
    amount: Number.isFinite(amount) ? Math.floor(amount) : 0,
    currency,
    metadata: payload as Record<string, unknown>,
  });

  if (!result.ok) {
    return result;
  }

  console.log("[billing] lava webhook processed", { userId, invoiceId, plan });
  return { ok: true };
}
