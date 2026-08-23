const STREAK_START_LEGACY_KEY = "myapp_start_date";

function scopedKey(base: string, userId: string): string {
  return `${base}:${userId}`;
}

function accountCreatedMs(accountCreatedAt: string | undefined): number {
  if (!accountCreatedAt) return Date.now();
  const ms = new Date(accountCreatedAt).getTime();
  return Number.isFinite(ms) ? ms : Date.now();
}

/** Unscoped leftover belongs to this user only if it cannot predate the account. */
function canAdoptLegacyValue(accountCreatedAt: string | undefined, legacyIso?: string): boolean {
  const createdMs = accountCreatedMs(accountCreatedAt);
  if (legacyIso) {
    const legacyMs = new Date(legacyIso).getTime();
    if (Number.isFinite(legacyMs) && legacyMs < createdMs - 60_000) {
      return false;
    }
  }
  return Date.now() - createdMs > 3_600_000;
}

export function streakStartKey(userId: string): string {
  return scopedKey(STREAK_START_LEGACY_KEY, userId);
}

export function readOrInitStreakStartIso(
  userId: string,
  accountCreatedAt: string | undefined,
): string {
  const key = streakStartKey(userId);
  const scoped = localStorage.getItem(key);
  if (scoped && Number.isFinite(new Date(scoped).getTime())) {
    return scoped;
  }

  const nowIso = new Date().toISOString();
  const legacy = localStorage.getItem(STREAK_START_LEGACY_KEY);
  if (legacy && Number.isFinite(new Date(legacy).getTime()) && canAdoptLegacyValue(accountCreatedAt, legacy)) {
    localStorage.setItem(key, legacy);
    return legacy;
  }

  localStorage.setItem(key, nowIso);
  return nowIso;
}

export function writeStreakStartIso(userId: string, iso: string): void {
  localStorage.setItem(streakStartKey(userId), iso);
}

export function clearStreakStartIso(userId: string): void {
  localStorage.removeItem(streakStartKey(userId));
  localStorage.removeItem(STREAK_START_LEGACY_KEY);
}

export function readUserScopedItem(
  userId: string,
  baseKey: string,
  accountCreatedAt: string | undefined,
): string | null {
  const scoped = localStorage.getItem(scopedKey(baseKey, userId));
  if (scoped !== null) return scoped;
  const legacy = localStorage.getItem(baseKey);
  if (legacy === null) return null;
  if (!canAdoptLegacyValue(accountCreatedAt)) return null;
  localStorage.setItem(scopedKey(baseKey, userId), legacy);
  return legacy;
}

export function writeUserScopedItem(userId: string, baseKey: string, value: string): void {
  localStorage.setItem(scopedKey(baseKey, userId), value);
}

export function clearUserScopedItem(userId: string, baseKey: string): void {
  localStorage.removeItem(scopedKey(baseKey, userId));
  localStorage.removeItem(baseKey);
}
