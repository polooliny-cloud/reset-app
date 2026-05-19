import {
  calculateLevel,
  xpThresholdForLevel,
  xpThresholdForNextLevel,
} from "@/lib/profile/calculateLevel";

type Skill = {
  level: number;
  title: string;
  xp: number;
};

export type { Skill };

export const SKILLS: Skill[] = [
  { level: 1, title: "Ты начинаешь замечать импульсы", xp: 0 },
  { level: 2, title: "Ты распознаёшь свои триггеры", xp: 64 },
  { level: 3, title: "Ты иногда останавливаешь реакцию", xp: 160 },
  { level: 4, title: "Ты создаёшь паузу перед действием", xp: 384 },
  { level: 5, title: "Ты контролируешь реакцию в большинстве случаев", xp: 800 },
  { level: 6, title: "Ты заменяешь импульс на осознанное действие", xp: 1440 },
  { level: 7, title: "Ты управляешь своими триггерами", xp: 2240 },
  { level: 8, title: "Ты стабильно контролируешь поведение", xp: 3200 },
  { level: 9, title: "Ты формируешь новые привычки", xp: 4160 },
  { level: 10, title: "Самоконтроль стал твоей системой", xp: 5072 },
];

function safeXp(xp: number): number {
  if (!Number.isFinite(xp)) return 0;
  return Math.max(0, xp);
}

export function getSkillLevel(xp: number): Skill {
  const safe = safeXp(xp);
  const level = calculateLevel(safe);
  const titleSkill = SKILLS[Math.min(level - 1, SKILLS.length - 1)] ?? SKILLS[0];
  return {
    level,
    title: titleSkill.title,
    xp: xpThresholdForLevel(level),
  };
}

export function getSkillProgress(xp: number): {
  percent: number;
  currentXp: number;
  requiredXp: number;
  nextXp: number;
  isMax: boolean;
} {
  const safe = safeXp(xp);
  const level = calculateLevel(safe);
  const currentThreshold = xpThresholdForLevel(level);
  const nextThreshold = xpThresholdForNextLevel(level);

  if (nextThreshold <= currentThreshold) {
    return {
      percent: 100,
      currentXp: safe,
      requiredXp: currentThreshold,
      nextXp: currentThreshold,
      isMax: true,
    };
  }

  const progressXp = safe - currentThreshold;
  const requiredXp = nextThreshold - currentThreshold;

  return {
    percent: Math.min((progressXp / requiredXp) * 100, 100),
    currentXp: progressXp,
    requiredXp,
    nextXp: nextThreshold,
    isMax: false,
  };
}
