/**
 * Минимальный суммарный XP для достижения уровня (level 1 = 0 xp).
 * Якоря: L2=100, L3=250, L4=500; далее шаг растёт ~×1.6.
 */
export function xpThresholdForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  if (l <= 1) return 0;

  const seedGaps = [100, 150, 250];
  let total = 0;
  let lastGap = seedGaps[seedGaps.length - 1]!;

  for (let i = 2; i <= l; i++) {
    const gapIndex = i - 2;
    const gap =
      gapIndex < seedGaps.length
        ? seedGaps[gapIndex]!
        : Math.floor(lastGap * 1.6);
    if (gapIndex >= seedGaps.length) {
      lastGap = gap;
    }
    total += gap;
  }

  return total;
}

/** Уровень по суммарному XP (1-based). */
export function calculateLevel(xp: number): number {
  const safe = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  let level = 1;
  while (xpThresholdForLevel(level + 1) <= safe) {
    level += 1;
    if (level > 10_000) break;
  }
  return level;
}

export function xpThresholdForNextLevel(level: number): number {
  return xpThresholdForLevel(level + 1);
}
