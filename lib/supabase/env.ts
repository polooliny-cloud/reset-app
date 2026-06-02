/** Must be literal `process.env.NEXT_PUBLIC_*` so Next inlines values into the client bundle. */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function requireSupabaseEnv(): { url: string; anonKey: string } {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them to .env.local and restart `next dev`.",
    );
  }
  return { url: supabaseUrl, anonKey: supabaseAnonKey };
}

/** Legacy localStorage key used by pre-SSR Supabase client (`sb-<project-ref>-auth-token`). */
export function getLegacyAuthStorageKey(): string {
  if (!supabaseUrl) return "sb-auth-token";
  try {
    const ref = new URL(supabaseUrl).hostname.split(".")[0];
    return `sb-${ref}-auth-token`;
  } catch {
    return "sb-auth-token";
  }
}
