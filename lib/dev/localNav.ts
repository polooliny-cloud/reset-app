export const DEV_NAV_BYPASS_KEY = "dev_nav_bypass";

export function isLocalhostHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

export function isDevNavBypassActive(): boolean {
  if (!isLocalhostHost()) return false;
  try {
    return sessionStorage.getItem(DEV_NAV_BYPASS_KEY) === "1";
  } catch {
    return false;
  }
}

export function enableDevNavBypass(): void {
  if (!isLocalhostHost()) return;
  try {
    sessionStorage.setItem(DEV_NAV_BYPASS_KEY, "1");
  } catch {
    // ignore
  }
}
