"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";

import { requireSupabaseEnv } from "./env";

const globalForSupabase = globalThis as typeof globalThis & {
  __supabase_browser_client?: ReturnType<typeof createBrowserClient<Database>>;
};

export function createSupabaseBrowserClient() {
  const { url, anonKey } = requireSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}

export function getSupabaseBrowserClient() {
  if (globalForSupabase.__supabase_browser_client) {
    return globalForSupabase.__supabase_browser_client;
  }

  const client = createSupabaseBrowserClient();
  if (typeof window !== "undefined") {
    globalForSupabase.__supabase_browser_client = client;
  }
  return client;
}
