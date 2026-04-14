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
  let current: Skill = SKILLS[0];

  for (let i = 0; i < SKILLS.length; i++) {
    if (safe >= SKILLS[i].xp) {
      current = SKILLS[i];
    } else {
      break;
    }
  }

  return current;
}

export function getSkillProgress(xp: number): {
  percent: number;
  currentXp: number;
  requiredXp: number;
  nextXp: number;
  isMax: boolean;
} {
  const safe = safeXp(xp);
  let current: Skill = SKILLS[0];
  let next: Skill | null = null;

  for (let i = 0; i < SKILLS.length; i++) {
    if (safe >= SKILLS[i].xp) {
      current = SKILLS[i];
      next = SKILLS[i + 1] ?? null;
    }
  }

  if (!next) {
    return {
      percent: 100,
      currentXp: safe,
      requiredXp: current.xp,
      nextXp: current.xp,
      isMax: true,
    };
  }

  const progressXp = safe - current.xp;
  const requiredXp = next.xp - current.xp;

  return {
    percent: Math.min((progressXp / requiredXp) * 100, 100),
    currentXp: progressXp,
    requiredXp,
    nextXp: next.xp,
    isMax: false,
  };
}
