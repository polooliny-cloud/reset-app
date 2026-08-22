import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

let adminClient: SupabaseClient<Database> | null = null;

function resolveServiceKey(): string | undefined {
  const key =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return key || undefined;
}

function assertModernServiceKey(key: string): void {
  if (key.startsWith("eyJ")) {
    throw new Error(
      "Legacy API keys are disabled. Set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) to the sb_secret_… key from Supabase Dashboard → Project Settings → API Keys, then restart the server.",
    );
  }
}

/** Service-role / secret-key client for webhooks and billing mutations. Server-only. */
export function createAdminClient(): SupabaseClient<Database> {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = resolveServiceKey();

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for billing operations.",
    );
  }

  assertModernServiceKey(serviceKey);

  adminClient = createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}
