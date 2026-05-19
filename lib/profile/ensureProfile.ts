import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export type EnsureProfileResult =
  | { ok: true; created: boolean }
  | { ok: false; error: string };

const inflight = new Map<string, Promise<EnsureProfileResult>>();

/**
 * Ensures a row exists in `public.profiles` for the authenticated user.
 * New profiles start with onboarding_completed = false (DB default).
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
      onboarding_completed: false,
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

export const ensureProfile = ensureProfileForUser;
