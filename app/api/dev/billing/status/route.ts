import { NextResponse } from "next/server";

import { getAuthUserFromRequest } from "@/lib/billing/authFromRequest";
import { canAccessBillingDevTools } from "@/lib/billing/devAccess";
import { fetchBillingDebugSnapshot } from "@/lib/billing/fetchBillingDebugSnapshot";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessBillingDevTools(request, user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snapshot = await fetchBillingDebugSnapshot(user.id);
  return NextResponse.json({ ok: true, ...snapshot });
}
