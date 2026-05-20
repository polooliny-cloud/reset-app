/** Temporary: show checkout URL on screen before redirect (dev / ?checkout_debug=1). */
export function isCheckoutRedirectDebugEnabled(search?: string): boolean {
  if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") return true;
  if (process.env.NODE_ENV === "development") return true;

  const qs =
    search ??
    (typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "");
  if (!qs) return false;

  try {
    return new URLSearchParams(qs).get("checkout_debug") === "1";
  } catch {
    return false;
  }
}
