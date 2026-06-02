"use client";

/**
 * Browser Supabase client (cookie-based session via @supabase/ssr).
 * Import this from client components and hooks.
 */
export { getSupabaseBrowserClient as createBrowserClient } from "@/lib/supabase/client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const supabase = getSupabaseBrowserClient();
