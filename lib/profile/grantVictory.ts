import type { SupabaseClient } from "@supabase/supabase-js";

import { calculateLevel } from "@/lib/profile/calculateLevel";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase/database.types";

export type VictoryTrigger =
  | "onboarding_complete"
  | "first_day_clean"
  | "relapse_resisted"
  | "daily_checkin"
  | "manual";

/** Триггеры, которые можно выдать только один раз на пользователя. */
const DEDUP_TRIGGERS: ReadonlySet<VictoryTrigger> = new Set([
  "onboarding_complete",
  "first_day_clean",
]);

export type GrantVictoryParams = {
  userId: string;
  trigger: VictoryTrigger;
  xp: number;
  client?: SupabaseClient<Database>;
};

export type GrantVictoryProfile = {
  xp: number;
  level: number;
  victories: number;
};

export type GrantVictoryResult =
  | { ok: true; duplicate: true; profile?: GrantVictoryProfile }
  | { ok: true; duplicate: false; profile: GrantVictoryProfile }
  | { ok: false; error: string };

type ProfileProgressRow = {
  xp: number | null;
  level: number | null;
  victories: number | null;
};

async function fetchProfileProgress(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<ProfileProgressRow | null> {
  const { data, error } = await client
    .from("profiles")
    .select("xp, level, victories")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function hasExistingVictory(
  client: SupabaseClient<Database>,
  userId: string,
  trigger: VictoryTrigger,
): Promise<boolean> {
  const { data, error } = await client
    .from("victories")
    .select("id")
    .eq("user_id", userId)
    .eq("trigger", trigger)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function grantVictory({
  userId,
  trigger,
  xp,
  client = supabase,
}: GrantVictoryParams): Promise<GrantVictoryResult> {
  const safeXp = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;

  if (!userId) {
    return { ok: false, error: "userId is required" };
  }

  try {
    if (DEDUP_TRIGGERS.has(trigger)) {
      const exists = await hasExistingVictory(client, userId, trigger);
      if (exists) {
        console.log("[victory] duplicate prevented", { userId, trigger });
        const profile = await fetchProfileProgress(client, userId);
        if (profile) {
          return {
            ok: true,
            duplicate: true,
            profile: {
              xp: profile.xp ?? 0,
              level: profile.level ?? 1,
              victories: profile.victories ?? 0,
            },
          };
        }
        return { ok: true, duplicate: true };
      }
    }

    const current = await fetchProfileProgress(client, userId);
    if (!current) {
      return { ok: false, error: "Profile not found" };
    }

    const prevXp = current.xp ?? 0;
    const prevVictories = current.victories ?? 0;
    const nextXp = prevXp + safeXp;
    const nextLevel = calculateLevel(nextXp);
    const nextVictories = prevVictories + 1;

    const { error: insertError } = await client.from("victories").insert({
      user_id: userId,
      trigger,
      xp: safeXp,
    });

    if (insertError) {
      if (insertError.code === "23505" && DEDUP_TRIGGERS.has(trigger)) {
        console.log("[victory] duplicate prevented", { userId, trigger });
        const profile = await fetchProfileProgress(client, userId);
        if (profile) {
          return {
            ok: true,
            duplicate: true,
            profile: {
              xp: profile.xp ?? 0,
              level: profile.level ?? 1,
              victories: profile.victories ?? 0,
            },
          };
        }
        return { ok: true, duplicate: true };
      }
      return { ok: false, error: insertError.message };
    }

    const updatePayload: Database["public"]["Tables"]["profiles"]["Update"] = {
      xp: nextXp,
      level: nextLevel,
      victories: nextVictories,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await client
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    console.log("[victory] granted", { userId, trigger, xp: safeXp });
    console.log("[victory] profile updated", {
      userId,
      xp: nextXp,
      level: nextLevel,
      victories: nextVictories,
    });

    return {
      ok: true,
      duplicate: false,
      profile: {
        xp: nextXp,
        level: nextLevel,
        victories: nextVictories,
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "grantVictory failed";
    return { ok: false, error: message };
  }
}
