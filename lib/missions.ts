const HOURS = 3_600_000;

export const MISSION_XP_REWARD = 54;
export const MISSION_INTERVAL_HOURS = [
  6, 12, 24, 36, 48, 72, 120, 168, 240, 360, 480, 594,
] as const;

export type MissionStatus = {
  missionIndex: number;
  totalMissions: number;
  pendingRewards: number;
  completedCount: number;
  claimedCount: number;
  isMissionComplete: boolean;
  isFullyCompleted: boolean;
  missionDurationMs: number;
  missionElapsedMs: number;
  missionRemainingMs: number;
  missionProgress: number;
};

const MISSION_DURATIONS_MS = MISSION_INTERVAL_HOURS.map((hours) => hours * HOURS);
const MISSION_CUMULATIVE_MS = MISSION_DURATIONS_MS.reduce<number[]>(
  (acc, duration, index) => {
    const previous = index === 0 ? 0 : acc[index - 1];
    acc.push(previous + duration);
    return acc;
  },
  [],
);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function safeFinite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function getMissionLabel(hours: number): string {
  const days = hours / 24;
  if (days >= 1 && Number.isInteger(days)) return `${days} дн.`;
  if (hours < 24) return `${hours} ч.`;
  return `${Math.floor(days)} дн. ${hours % 24} ч.`;
}

export function formatMissionCountdown(remainingMs: number): string {
  const safe = Math.max(0, Math.floor(remainingMs / 1000));
  const days = Math.floor(safe / 86_400);
  const hours = Math.floor((safe % 86_400) / 3_600);
  const minutes = Math.floor((safe % 3_600) / 60);
  const seconds = safe % 60;
  return `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function resolveMissionStatus(elapsedMs: number, claimedCount: number): MissionStatus {
  const totalMissions = MISSION_DURATIONS_MS.length;
  const safeElapsed = Math.max(0, safeFinite(elapsedMs));
  const safeClaimed = clamp(Math.floor(safeFinite(claimedCount)), 0, totalMissions);

  let completedCount = 0;
  for (let i = 0; i < totalMissions; i++) {
    if (safeElapsed >= MISSION_CUMULATIVE_MS[i]) {
      completedCount += 1;
    } else {
      break;
    }
  }

  const effectiveClaimed = Math.min(safeClaimed, completedCount);
  const pendingRewards = Math.max(completedCount - effectiveClaimed, 0);
  const isFullyCompleted = completedCount >= totalMissions;
  const missionIndex = clamp(effectiveClaimed, 0, Math.max(totalMissions - 1, 0));
  const missionStartMs = missionIndex === 0 ? 0 : MISSION_CUMULATIVE_MS[missionIndex - 1];
  const missionEndMs = MISSION_CUMULATIVE_MS[missionIndex] ?? missionStartMs;
  const missionDurationMs = Math.max(1, missionEndMs - missionStartMs);
  const missionElapsedMs = clamp(safeElapsed - missionStartMs, 0, missionDurationMs);
  const missionRemainingMs = Math.max(missionEndMs - safeElapsed, 0);
  const missionProgress =
    missionDurationMs > 0 ? clamp(missionElapsedMs / missionDurationMs, 0, 1) : 1;

  return {
    missionIndex,
    totalMissions,
    pendingRewards,
    completedCount,
    claimedCount: effectiveClaimed,
    isMissionComplete: missionRemainingMs <= 0,
    isFullyCompleted,
    missionDurationMs,
    missionElapsedMs,
    missionRemainingMs,
    missionProgress,
  };
}

export function getMissionSummary(missionIndex: number): string {
  const safeIndex = clamp(missionIndex, 0, MISSION_INTERVAL_HOURS.length - 1);
  const rewardTexts = [
    'Первый шаг сделан. Твой мозг только что доказал, что может обходиться без дешевого дофамина. Ты сильнее своих импульсов. Это маленькая победа, с которой начинается большая свобода. Идем дальше.',
    'Половина суток в полной осознанности. Ты пережил самый сложный период адаптации. Твои рецепторы начинают отдыхать от перегрузки. Гордись собой, ты взял управление на себя.',
    'Целые сутки без срывов. Это серьезный результат. Твой организм начинает восстанавливать естественный баланс. Завтра ты проснешься с чуть большей энергией, чем обычно. Не останавливайся.',
    'Ты преодолел отметку в 36 часов. Сейчас мозг может пытаться торговаться с тобой, но ты уже умеешь его переигрывать. Каждая такая победа делает твою волю крепче стали.',
    'Уровень Устойчивость достигнут. Ты уже забываешь, каково это быть рабом привычки. Туман в голове начинает рассеиваться. Ты возвращаешь себе право выбирать свое будущее.',
    'Три дня чистоты. Это критический порог, который многие не проходят. Но ты здесь. Твоя решимость впечатляет. Почувствуй, как возвращается самоуважение.',
    'Почти неделя. Твой уровень тестостерона и энергии стабилизируется. Ты становишься спокойнее и внимательнее к деталям жизни. Это и есть настоящий ты.',
    'Неделя. Семь дней контроля. Ты доказал, что это не случайность, а система. Твой мозг активно строит новые нейронные связи. Ты на верном пути к полной перезагрузке.',
    'Десять дней. Ты входишь в элиту тех, кто реально меняет свою жизнь. Мир становится ярче, а твоя концентрация острее. Ты строишь фундамент для новой личности.',
    'Месяц. Это легендарно. Ты полностью изменил свой химический профиль. Твое восприятие женщин и отношений стало здоровым. Ты больше не жертва алгоритмов. Ты хозяин своей жизни.',
    'Экватор. Половина пути пройдена. Ты уже не тот человек, который скачал это приложение. Ты стал сильнее, увереннее и чище. Впереди финишная прямая к полной свободе.',
    '90 дней. Ты прошел через огонь и перестроил свой разум. Теперь ты обладаешь абсолютным самоконтролем. Это не конец пути, это начало твоей новой, настоящей жизни без зависимостей.',
  ] as const;
  return rewardTexts[safeIndex];
}

export function getMissionRewardTitle(missionIndex: number): string {
  const safeIndex = clamp(missionIndex, 0, MISSION_INTERVAL_HOURS.length - 1);
  if (safeIndex === MISSION_INTERVAL_HOURS.length - 1) {
    return 'Победа! Перезагрузка завершена.';
  }
  return 'Задание выполнено!';
}

export function getMissionMeta(missionIndex: number): { title: string; durationLabel: string } {
  const safeIndex = clamp(missionIndex, 0, MISSION_INTERVAL_HOURS.length - 1);
  const hours = MISSION_INTERVAL_HOURS[safeIndex];
  return {
    title: `Миссия ${safeIndex + 1}`,
    durationLabel: getMissionLabel(hours),
  };
}

export const TOTAL_MISSIONS_DURATION_MS = MISSION_CUMULATIVE_MS[MISSION_CUMULATIVE_MS.length - 1];
