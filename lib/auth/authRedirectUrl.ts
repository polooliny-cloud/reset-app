const PRODUCTION_ORIGIN = "https://resetapp.ru";

export function getMagicLinkRedirectUrl(nextPath = "/onboarding"): string {
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCTION_ORIGIN;

  const next = nextPath.startsWith("/") ? nextPath : "/onboarding";
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}
