import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

const isBrowser = typeof window !== "undefined";

function readEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function createSingletonClient(): SupabaseClient<Database> {
  return createClient<Database>(
    readEnv("NEXT_PUBLIC_SUPABASE_URL"),
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: {
        persistSession: isBrowser,
        autoRefreshToken: isBrowser,
        detectSessionInUrl: isBrowser,
      },
    },
  );
}

const globalForSupabase = globalThis as typeof globalThis & {
  __supabase_singleton?: SupabaseClient<Database>;
};

export const supabase: SupabaseClient<Database> =
  globalForSupabase.__supabase_singleton ?? createSingletonClient();

if (process.env.NODE_ENV !== "production") {
  globalForSupabase.__supabase_singleton = supabase;
}
