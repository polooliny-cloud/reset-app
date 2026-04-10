/** Порог первого уровня и множитель роста (Math.floor на каждом шаге). */
export const BASE_XP = 60;
/** При необходимости ближе к ~1300–1500 xp на 23-й уровень см. ТЗ §9 (например GROWTH 1.05). */
export const GROWTH = 1.06;

export const TITLES = [
  'Новичок',
  'Рекрут',
  'Ученик',
  'Испытатель',
  'Любитель',
  'Боец',
  'Специалист',
  'Ветеран',
  'Адепт',
  'Профи',
  'Эксперт',
  'Мастер',
  'Гроссмейстер',
  'Элита',
  'Герой',
  'Чемпион',
  'Легенда',
  'Мифик',
  'Бессмертный',
  'Творец',
  'Титан',
  'Завоеватель',
  'Абсолют',
] as const;

export function getLevel(xp: number): number {
  let level = 1;
  let required = BASE_XP;
  let total = xp;

  while (total >= required) {
    total -= required;
    required = Math.floor(required * GROWTH);
    level++;
  }

  return level;
}

export function getProgress(xp: number): {
  current: number;
  required: number;
  percent: number;
} {
  let required = BASE_XP;
  let total = xp;

  while (total >= required) {
    total -= required;
    required = Math.floor(required * GROWTH);
  }

  return {
    current: total,
    required,
    percent: Math.min((total / required) * 100, 100),
  };
}

export function getTitle(level: number): string {
  const index = Math.min(level - 1, TITLES.length - 1);
  return TITLES[index] ?? TITLES[TITLES.length - 1];
}
