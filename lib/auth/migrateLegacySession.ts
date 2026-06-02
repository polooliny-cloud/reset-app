import type { SupabaseClient } from "@supabase/supabase-js";

import { getLegacyAuthStorageKey } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";

type StoredSession = {
  access_token?: string;
  refresh_token?: string;
};

/**
 * One-time migration: copy session from the old localStorage-based client into cookie storage.
 */
export async function migrateLegacyLocalStorageSession(
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const key = getLegacyAuthStorageKey();
  let raw: string | null = null;

  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return false;
  }

  if (!raw) return false;

  let stored: StoredSession;
  try {
    stored = JSON.parse(raw) as StoredSession;
  } catch {
    return false;
  }

  const { access_token, refresh_token } = stored;
  if (!access_token || !refresh_token) return false;

  const { data: existing } = await supabase.auth.getSession();
  if (existing.session?.user) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return false;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (error || !data.session) {
    console.warn("[auth] legacy session migration failed", error?.message);
    return false;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }

  console.log("[auth] legacy localStorage session migrated to cookies");
  return true;
}
