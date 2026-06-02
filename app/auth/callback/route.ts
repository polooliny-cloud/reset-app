import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/onboarding";
  }
  return raw;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    console.error("[auth/callback] exchangeCodeForSession failed", error.message);
  }

  const failUrl = new URL("/onboarding", requestUrl.origin);
  failUrl.searchParams.set("auth_error", "callback");
  return NextResponse.redirect(failUrl);
}
