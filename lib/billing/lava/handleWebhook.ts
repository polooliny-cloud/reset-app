import { activatePaidSubscription } from "@/lib/billing/activateSubscription";
import { billingLog } from "@/lib/billing/log";
import { markPaymentFailedByInvoice } from "@/lib/billing/markPaymentFailed";
import { parseLavaCustomFields } from "@/lib/billing/lava/parseCustomFields";
import type { LavaCheckoutPlan, LavaWebhookPayload } from "@/lib/billing/lava/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type HandleLavaWebhookResult = {
  ok: boolean;
  error?: string;
  duplicate?: boolean;
  ignored?: boolean;
  userId?: string;
  plan?: LavaCheckoutPlan;
  invoiceId?: string;
};

function isPaidStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === "success" || s.includes("paid");
}

function isFailureStatus(status: string): boolean {
  const s = status.toLowerCase();
  return (
    s === "expired" ||
    s === "failed" ||
    s === "fail" ||
    s.includes("cancel") ||
    s === "error"
  );
}

export async function handleLavaWebhook(
  payload: LavaWebhookPayload,
): Promise<HandleLavaWebhookResult> {
  const status = (payload.status ?? payload.event ?? "").toLowerCase();
  const invoiceId = payload.invoice_id ? String(payload.invoice_id) : undefined;
  const orderId = payload.order_id ? String(payload.order_id) : undefined;

  if (!isPaidStatus(status)) {
    if (isFailureStatus(status) && invoiceId) {
      const admin = createAdminClient();
      await markPaymentFailedByInvoice(admin, invoiceId, {
        ...(payload as Record<string, unknown>),
        webhook_status: status,
      });
      billingLog("webhook_payment_failed", { invoiceId, orderId, status });
    } else {
      billingLog("webhook_ignored", { status, invoiceId, orderId });
    }
    return { ok: true, ignored: true, invoiceId };
  }

  const customRaw = payload.custom_fields ?? payload.customFields ?? null;
  const custom = parseLavaCustomFields(customRaw);

  const admin = createAdminClient();

  let userId = custom.user_id;
  let plan = custom.plan;

  if (!userId && invoiceId) {
    const { data: payment } = await admin
      .from("payments")
      .select("user_id, metadata")
      .eq("provider", "lava")
      .eq("provider_invoice_id", invoiceId)
      .maybeSingle();

    if (payment) {
      userId = payment.user_id;
      const meta = payment.metadata as { plan?: LavaCheckoutPlan } | null;
      plan = plan ?? meta?.plan;
    }
  }

  if (!userId || !invoiceId) {
    billingLog(
      "webhook_invalid_payload",
      { invoiceId, orderId, customRaw },
      "error",
    );
    return { ok: false, error: "Invalid webhook payload" };
  }

  const resolvedPlan: LavaCheckoutPlan = plan ?? "monthly";
  const amountRub = Number(payload.amount ?? 0);
  const amountKopecks = Number.isFinite(amountRub) ? Math.round(amountRub * 100) : 0;

  billingLog("webhook_activation_start", {
    userId,
    invoiceId,
    orderId,
    plan: resolvedPlan,
    status,
    amountKopecks,
  });

  const result = await activatePaidSubscription(admin, {
    userId,
    plan: resolvedPlan,
    providerInvoiceId: invoiceId,
    amount: amountKopecks,
    currency: "RUB",
    metadata: {
      ...(payload as Record<string, unknown>),
      order_id: orderId,
      plan: resolvedPlan,
    },
  });

  if (!result.ok) {
    billingLog(
      "webhook_activation_failed",
      { userId, invoiceId, plan: resolvedPlan, error: result.error },
      "error",
    );
    return { ok: false, error: result.error, userId, plan: resolvedPlan, invoiceId };
  }

  if (result.duplicate) {
    billingLog("webhook_duplicate_ignored", { userId, invoiceId, plan: resolvedPlan });
    return { ok: true, duplicate: true, userId, plan: resolvedPlan, invoiceId };
  }

  billingLog("webhook_activation_success", {
    userId,
    invoiceId,
    plan: resolvedPlan,
  });

  return { ok: true, userId, plan: resolvedPlan, invoiceId };
}
