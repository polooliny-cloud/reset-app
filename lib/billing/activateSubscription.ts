import type { SupabaseClient } from "@supabase/supabase-js";

import { billingLog } from "@/lib/billing/log";
import type { BillingProvider, SubscriptionPlan } from "@/lib/billing/types";
import { PLAN_DURATION_DAYS } from "@/lib/billing/types";
import type { Database } from "@/lib/supabase/database.types";

function addDaysIso(from: Date, days: number): string {
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}

export function resolvePremiumUntil(plan: SubscriptionPlan, from = new Date()): string | null {
  if (plan === "free_trial") return addDaysIso(from, 3);
  const days = PLAN_DURATION_DAYS[plan];
  return addDaysIso(from, days);
}

export async function activatePaidSubscription(
  admin: SupabaseClient<Database>,
  input: {
    userId: string;
    plan: Exclude<SubscriptionPlan, "free_trial">;
    provider?: Exclude<BillingProvider, "internal">;
    providerInvoiceId: string;
    amount: number;
    currency: string;
    metadata?: Record<string, unknown>;
  },
): Promise<{ ok: true; duplicate?: boolean } | { ok: false; error: string }> {
  const provider = input.provider ?? "yookassa";
  const { data, error } = await admin.rpc("activate_paid_subscription_atomic", {
    p_provider: provider,
    p_provider_invoice_id: input.providerInvoiceId,
    p_user_id: input.userId,
    p_plan: input.plan,
    p_amount: input.amount,
    p_currency: input.currency,
    p_metadata: (input.metadata ?? {}) as Database["public"]["Functions"]["activate_paid_subscription_atomic"]["Args"]["p_metadata"],
  });

  if (error) {
    billingLog("paid_activation_rpc_failed", { provider, error: error.message }, "error");
    return { ok: false, error: error.message };
  }

  const result = (data ?? {}) as {
    ok?: boolean;
    duplicate?: boolean;
    error?: string;
    code?: string;
    premium_until?: string;
  };

  if (result.duplicate) {
    billingLog("payment_duplicate", {
      userId: input.userId,
      provider,
      providerInvoiceId: input.providerInvoiceId,
    });
    return { ok: true, duplicate: true };
  }

  if (!result.ok) {
    billingLog(
      "paid_activation_rejected",
      { provider, code: result.code ?? "unknown", error: result.error ?? "unknown" },
      "error",
    );
    return { ok: false, error: result.error ?? "Payment activation rejected" };
  }

  billingLog("premium_activated", {
    userId: input.userId,
    plan: input.plan,
    premiumUntil: result.premium_until ?? null,
    providerInvoiceId: input.providerInvoiceId,
  });

  return { ok: true };
}
