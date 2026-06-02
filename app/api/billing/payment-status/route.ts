import { NextResponse } from "next/server";

import { getUserIdFromRequest } from "@/lib/billing/authFromRequest";
import { fetchPremiumStateForUser } from "@/lib/billing/fetchPremiumData";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const orderId = url.searchParams.get("order_id")?.trim();
  const admin = createAdminClient();

  let query = admin
    .from("payments")
    .select("provider_invoice_id, amount, currency, status, metadata, created_at")
    .eq("user_id", userId)
    .eq("provider", "yookassa")
    .order("created_at", { ascending: false })
    .limit(1);

  if (orderId) {
    query = query.contains("metadata", { orderId });
  }

  const { data: payment, error } = await query.maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const premium = await fetchPremiumStateForUser(admin, userId);

  return NextResponse.json({
    ok: true,
    payment: payment
      ? {
          id: payment.provider_invoice_id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          created_at: payment.created_at,
        }
      : null,
    premium,
  });
}
