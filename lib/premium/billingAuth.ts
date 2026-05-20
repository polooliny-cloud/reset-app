import { supabase } from "@/lib/supabase";

export async function getBillingAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
