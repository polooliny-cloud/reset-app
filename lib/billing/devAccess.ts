/**
 * Guards dev-only billing verification routes (mock activation, debug API).
 */

function parseAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseAdminEmails().includes(email.toLowerCase());
}

export function isLocalhostRequest(request: Request): boolean {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(",")[0]
    ?.trim()
    .toLowerCase();

  if (!host) return false;
  return (
    host.startsWith("localhost:") ||
    host === "localhost" ||
    host.startsWith("127.0.0.1:") ||
    host === "127.0.0.1" ||
    host.startsWith("[::1]:")
  );
}

export function isBillingDevEnvironment(request?: Request): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (request && isLocalhostRequest(request)) return true;
  if (process.env.BILLING_DEV_ALLOW_STAGING === "true") return true;
  return false;
}

export function canAccessBillingDevTools(
  request: Request,
  userEmail: string | null | undefined,
): boolean {
  if (isBillingDevEnvironment(request)) return true;
  if (isAdminEmail(userEmail)) return true;
  return false;
}
