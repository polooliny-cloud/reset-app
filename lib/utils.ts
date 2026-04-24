/**
 * Склонение существительного «день» по числительному (рус. язык).
 */
export function getDaysWord(days: number): string {
  const lastTwo = days % 100;
  const last = days % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return 'дней';
  }

  if (last === 1) {
    return 'день';
  }

  if (last >= 2 && last <= 4) {
    return 'дня';
  }

  return 'дней';
}
