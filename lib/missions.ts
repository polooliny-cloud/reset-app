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
    'Первый шаг сделан. Ваш мозг только что доказал, что может обходиться без дешёвого дофамина. Вы сильнее своих импульсов. Это маленькая победа, с которой начинается большая свобода. Идём дальше.',
    'Половина суток в полной осознанности. Вы пережили самый сложный период адаптации. Ваши рецепторы начинают отдыхать от перегрузки. Гордитесь собой: вы взяли управление на себя.',
    'Целые сутки без срывов. Это серьёзный результат. Ваш организм начинает восстанавливать естественный баланс. Завтра вы проснётесь с чуть большей энергией, чем обычно. Не останавливайтесь.',
    'Вы преодолели отметку в 36 часов. Сейчас мозг может пытаться торговаться с вами, но вы уже умеете его переигрывать. Каждая такая победа делает вашу волю крепче стали.',
    'Уровень «Устойчивость» достигнут. Вы уже забываете, каково это быть рабом привычки. Туман в голове начинает рассеиваться. Вы возвращаете себе право выбирать своё будущее.',
    'Три дня чистоты. Это критический порог, который многие не проходят. Но вы здесь. Ваша решимость впечатляет. Почувствуйте, как возвращается самоуважение.',
    'Почти неделя. Ваш уровень тестостерона и энергии стабилизируется. Вы становитесь спокойнее и внимательнее к деталям жизни. Это и есть настоящий вы.',
    'Неделя. Семь дней контроля. Вы доказали, что это не случайность, а система. Ваш мозг активно строит новые нейронные связи. Вы на верном пути к полной перезагрузке.',
    'Десять дней. Вы входите в элиту тех, кто реально меняет свою жизнь. Мир становится ярче, а ваша концентрация острее. Вы строите фундамент для новой личности.',
    'Месяц. Это легендарно. Вы полностью изменили свой химический профиль. Ваше восприятие женщин и отношений стало здоровым. Вы больше не жертва алгоритмов. Вы хозяин своей жизни.',
    'Экватор. Половина пути пройдена. Вы уже не тот человек, который скачал это приложение. Вы стали сильнее, увереннее и чище. Впереди финишная прямая к полной свободе.',
    '90 дней. Вы прошли через огонь и перестроили свой разум. Теперь вы обладаете абсолютным самоконтролем. Это не конец пути, это начало вашей новой, настоящей жизни без зависимостей.',
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
