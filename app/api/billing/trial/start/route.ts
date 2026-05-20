import { NextResponse } from "next/server";

import { fetchPremiumStateForUser } from "@/lib/billing/fetchPremiumData";
import { startFreeTrial } from "@/lib/billing/startFreeTrial";
import { trialLog } from "@/lib/billing/trialLog";
import { getUserIdFromRequest } from "@/lib/billing/authFromRequest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

/** Supabase-only trial activation. Must never import lib/billing/lava/* or checkout. */
export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    trialLog("request_unauthorized", {}, "warn");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  trialLog("request_started", { userId });

  try {
    const admin = createAdminClient();
    const result = await startFreeTrial(admin, userId);

    if (!result.ok) {
      trialLog("failed", { userId, code: result.code, error: result.error }, "error");
      const status = result.code === "trial_already_used" ? 409 : 400;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const reader = createClient<Database>(url, anonKey);
    const state = await fetchPremiumStateForUser(reader, userId);

    trialLog("premium_activated", {
      userId,
      premiumUntil: result.premiumUntil,
      isPremium: state.isPremium,
      isTrial: state.isTrial,
    });

    return NextResponse.json({
      ok: true,
      premiumUntil: result.premiumUntil,
      state,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Trial start failed";
    trialLog("failed", { userId, error: message }, "error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
