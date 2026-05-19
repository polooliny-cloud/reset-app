import { calculateLevel } from "@/lib/profile/calculateLevel";
import { PROFILE_LS_WINS_KEY, PROFILE_LS_XP_KEY } from "@/lib/profile/statsKeys";

export type ProfileProgressValues = {
  xp: number;
  victories: number;
  level: number;
};

export const DEFAULT_PROFILE_STATS: ProfileProgressValues = {
  xp: 0,
  victories: 0,
  level: 1,
};

export function normalizeStats(xp: number, victories: number): ProfileProgressValues {
  const safeXp = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  const safeV = Number.isFinite(victories) ? Math.max(0, Math.floor(victories)) : 0;
  return {
    xp: safeXp,
    victories: safeV,
    level: calculateLevel(safeXp),
  };
}

export function readLocalStats(): { xp: number; victories: number } {
  if (typeof window === "undefined") return { xp: 0, victories: 0 };
  try {
    const x = Number(window.localStorage.getItem(PROFILE_LS_XP_KEY));
    const w = Number(window.localStorage.getItem(PROFILE_LS_WINS_KEY));
    return {
      xp: Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0,
      victories: Number.isFinite(w) && w >= 0 ? Math.floor(w) : 0,
    };
  } catch {
    return { xp: 0, victories: 0 };
  }
}

export function mirrorStatsToLocal(values: ProfileProgressValues) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_LS_XP_KEY, String(values.xp));
    window.localStorage.setItem(PROFILE_LS_WINS_KEY, String(values.victories));
  } catch {
    // ignore
  }
}
