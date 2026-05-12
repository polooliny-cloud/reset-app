/** Client-side check before Supabase; not a full RFC parser. */
export function isValidEmail(value: string): boolean {
  const t = value.trim();
  if (t.length < 5 || t.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}
