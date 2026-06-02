import type { SupabaseClient } from "@supabase/supabase-js";

import { billingLog } from "@/lib/billing/log";
import type { BillingProvider } from "@/lib/billing/types";
import type { Database } from "@/lib/supabase/database.types";

export async function markPaymentFailedByInvoice(
  admin: SupabaseClient<Database>,
  providerInvoiceId: string,
  metadata?: Record<string, unknown>,
  provider: Exclude<BillingProvider, "internal"> = "yookassa",
): Promise<void> {
  const { data: payment, error: fetchError } = await admin
    .from("payments")
    .select("id, status")
    .eq("provider", provider)
    .eq("provider_invoice_id", providerInvoiceId)
    .maybeSingle();

  if (fetchError) {
    billingLog("payment_failed_lookup_error", { providerInvoiceId, error: fetchError.message }, "error");
    return;
  }

  if (!payment || payment.status !== "pending") {
    return;
  }

  const { error } = await admin
    .from("payments")
    .update({
      status: "failed",
      metadata: metadata as Database["public"]["Tables"]["payments"]["Update"]["metadata"],
    })
    .eq("id", payment.id)
    .eq("status", "pending");

  billingLog("payment_marked_failed", {
    providerInvoiceId,
    paymentId: payment.id,
    updateError: error?.message ?? null,
  });
}
