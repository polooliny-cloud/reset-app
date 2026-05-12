import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { ONBOARDING_COMPLETED_KEY } from "@/lib/onboarding";

export type EnsureProfileResult =
  | { ok: true; created: boolean }
  | { ok: false; error: string };

const inflight = new Map<string, Promise<EnsureProfileResult>>();

function readOnboardingCompleted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ONBOARDING_COMPLETED_KEY) === "true";
  } catch {
    return false;
  }
}

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === "23505";
}

/**
 * Ensures a row exists in `public.profiles` for the authenticated user.
 * Idempotent: existing profiles are left unchanged (no duplicate inserts).
 */
export async function ensureProfileForUser(
  client: SupabaseClient<Database>,
  user: User,
): Promise<EnsureProfileResult> {
  const pending = inflight.get(user.id);
  if (pending) {
    return pending;
  }

  const run = (async (): Promise<EnsureProfileResult> => {
    const { data: existing, error: selectError } = await client
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (selectError) {
      return { ok: false, error: selectError.message };
    }

    if (existing) {
      return { ok: true, created: false };
    }

    const payload: Database["public"]["Tables"]["profiles"]["Insert"] = {
      id: user.id,
      email: user.email ?? null,
      trial_started_at: new Date().toISOString(),
      onboarding_completed: readOnboardingCompleted(),
      xp: 0,
      level: 1,
      victories: 0,
    };

    const { error: insertError } = await client.from("profiles").insert(payload);

    if (!insertError) {
      return { ok: true, created: true };
    }

    if (isUniqueViolation(insertError)) {
      return { ok: true, created: false };
    }

    return { ok: false, error: insertError.message };
  })();

  const tracked = run.finally(() => {
    inflight.delete(user.id);
  });

  inflight.set(user.id, tracked);

  return tracked;
}
