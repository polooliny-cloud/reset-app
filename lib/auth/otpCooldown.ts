/** Formats seconds as "53с" for resend countdown labels. */
export function formatCooldownSeconds(totalSeconds: number): string {
  return `${Math.max(0, Math.floor(totalSeconds))}с`;
}
