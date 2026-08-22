/** Routes accessible without an authenticated session. */
export const PUBLIC_PATHS = [
  "/",
  "/onboarding",
  "/about",
  "/legal",
  "/privacy",
  "/terms",
  "/refunds",
  "/contacts",
  "/pricing",
  "/subscription-terms",
] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
