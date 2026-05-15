import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { ONBOARDING_COMPLETED_KEY } from "@/lib/onboarding";

export type EnsureProfileResult =
  | { ok: true; created: boolean }
  | { ok: false; error: string };

const inflight = new Map<string, Promise<EnsureProfileResult>>();

function readOnboardingCompletedFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ONBOARDING_COMPLETED_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Ensures `public.profiles` has a row for the authenticated user.
 * Uses upsert with ON CONFLICT DO NOTHING so existing rows are untouched.
 * Client-side only; requires RLS insert for own id.
 */
export async function ensureProfileForUser(
  client: SupabaseClient<Database>,
  user: User,
): Promise<EnsureProfileResult> {
  const pending = inflight.get(user.id);
  if (pending) {
    console.log("[ensureProfile] dedupe wait", user.id);
    return pending;
  }

  const run = (async (): Promise<EnsureProfileResult> => {
    const {
      data: existing,
      error: selectError,
    } = await client.from("profiles").select("id").eq("id", user.id).maybeSingle();

    if (selectError) {
      console.error("[ensureProfile] select failed", selectError.message, selectError);
      return { ok: false, error: selectError.message };
    }

    if (existing) {
      console.log("[ensureProfile] profile exists", user.id);
      return { ok: true, created: false };
    }

    const row: Database["public"]["Tables"]["profiles"]["Insert"] = {
      id: user.id,
      email: user.email ?? null,
      onboarding_completed: readOnboardingCompletedFromStorage(),
      trial_started_at: new Date().toISOString(),
      xp: 0,
      level: 1,
      victories: 0,
    };

    const { error: upsertError } = await client.from("profiles").upsert(row, {
      onConflict: "id",
      ignoreDuplicates: true,
    });

    if (upsertError) {
      console.error("[ensureProfile] upsert failed", upsertError.message, upsertError);
      return { ok: false, error: upsertError.message };
    }

    const { data: after, error: verifyError } = await client
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (verifyError) {
      console.error("[ensureProfile] verify after upsert failed", verifyError.message, verifyError);
      return { ok: false, error: verifyError.message };
    }

    if (after) {
      console.log("[ensureProfile] profile created", user.id);
      return { ok: true, created: true };
    }

    console.log("[ensureProfile] profile exists (race)", user.id);
    return { ok: true, created: false };
  })();

  const tracked = run.finally(() => {
    inflight.delete(user.id);
  });

  inflight.set(user.id, tracked);

  return tracked;
}

/** Alias for callers that prefer `ensureProfile`. */
export const ensureProfile = ensureProfileForUser;
