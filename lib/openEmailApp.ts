const WEB_GMAIL_URL = "https://mail.google.com";

/**
 * Opens the native mail app when possible (Gmail on iOS/Android), otherwise web Gmail.
 */
export function openEmailApp(): void {
  if (typeof window === "undefined") return;

  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);

  if (isIOS) {
    const openedAt = Date.now();
    window.location.href = "googlegmail://";
    window.setTimeout(() => {
      if (document.hidden) return;
      if (Date.now() - openedAt > 2500) return;
      window.open(WEB_GMAIL_URL, "_blank", "noopener,noreferrer");
    }, 700);
    return;
  }

  if (isAndroid) {
    const intentUrl =
      "intent://mail/#Intent;scheme=googlegmail;package=com.google.android.gm;" +
      `S.browser_fallback_url=${encodeURIComponent(WEB_GMAIL_URL)};end`;
    window.location.href = intentUrl;
    return;
  }

  window.open(WEB_GMAIL_URL, "_blank", "noopener,noreferrer");
}
