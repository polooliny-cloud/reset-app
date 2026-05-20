import { NextResponse } from "next/server";

import { getUserIdFromRequest } from "@/lib/billing/authFromRequest";
import type { LavaCheckoutPlan } from "@/lib/billing/lava/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PLAN_AMOUNTS_RUB: Record<LavaCheckoutPlan, number> = {
  monthly: 49900,
  yearly: 299000,
  lifetime: 499000,
};

/**
 * Creates a pending payment row and returns checkout URL placeholder.
 * Wire LAVA_API_KEY + Lava REST create-invoice when credentials are configured.
 */
export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { plan?: LavaCheckoutPlan };
  try {
    body = (await request.json()) as { plan?: LavaCheckoutPlan };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const plan = body.plan ?? "monthly";
  if (!["monthly", "yearly", "lifetime"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const lavaApiKey = process.env.LAVA_API_KEY;
  const lavaShopId = process.env.LAVA_SHOP_ID;

  if (!lavaApiKey || !lavaShopId) {
    return NextResponse.json(
      { error: "Lava is not configured. Set LAVA_API_KEY and LAVA_SHOP_ID." },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const providerInvoiceId = `reset_${userId}_${plan}_${Date.now()}`;
  const amount = PLAN_AMOUNTS_RUB[plan];

  const { error: insertError } = await admin.from("payments").insert({
    user_id: userId,
    provider: "lava",
    provider_invoice_id: providerInvoiceId,
    amount,
    currency: "RUB",
    status: "pending",
    metadata: { plan, providerInvoiceId },
  });

  if (insertError) {
    console.error("[billing] pending payment insert failed", insertError.message);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  console.log("[billing] checkout pending payment created", { userId, plan, providerInvoiceId });

  // TODO: replace with real Lava API invoice URL when integrating their SDK/REST.
  const checkoutUrl =
    process.env.LAVA_CHECKOUT_BASE_URL?.replace("{invoiceId}", providerInvoiceId) ??
    `https://app.lava.ru/checkout/${providerInvoiceId}`;

  return NextResponse.json({
    ok: true,
    checkoutUrl,
    providerInvoiceId,
    plan,
    amount,
    currency: "RUB",
  });
}
