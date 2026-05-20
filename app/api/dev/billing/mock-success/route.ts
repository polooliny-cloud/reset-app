import { NextResponse } from "next/server";

import { getAuthUserFromRequest } from "@/lib/billing/authFromRequest";
import { canAccessBillingDevTools } from "@/lib/billing/devAccess";
import { billingLog } from "@/lib/billing/log";
import { simulateWebhookSuccess } from "@/lib/billing/simulateWebhookSuccess";
import type { LavaCheckoutPlan } from "@/lib/billing/lava/types";
import { fetchBillingDebugSnapshot } from "@/lib/billing/fetchBillingDebugSnapshot";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessBillingDevTools(request, user.email)) {
    billingLog("dev_mock_forbidden", { userId: user.id }, "warn");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { plan?: LavaCheckoutPlan; provider_invoice_id?: string };
  try {
    body = (await request.json()) as { plan?: LavaCheckoutPlan; provider_invoice_id?: string };
  } catch {
    body = {};
  }

  const plan = body.plan ?? "monthly";
  if (plan !== "monthly" && plan !== "yearly") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const result = await simulateWebhookSuccess({
    userId: user.id,
    plan,
    providerInvoiceId: body.provider_invoice_id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const snapshot = await fetchBillingDebugSnapshot(user.id);

  return NextResponse.json({
    ok: true,
    invoice_id: result.invoiceId,
    message: "Simulated successful Lava webhook — premium activated via billing lifecycle",
    snapshot,
  });
}
