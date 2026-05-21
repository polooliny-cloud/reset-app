"use client";

import { useEffect } from "react";

const STORAGE_KEY = "reset_app_build_id";

async function clearStaleCaches(): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch {
    // ignore — no service worker or Cache API blocked
  }
}

/**
 * After deploy, old JS bundles may POST stale Next.js Server Action IDs.
 * Reload once when the build id changes so the client matches the server.
 */
export function DeployVersionGuard() {
  useEffect(() => {
    const buildId = process.env.NEXT_PUBLIC_BUILD_ID;
    if (!buildId) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored !== buildId) {
        localStorage.setItem(STORAGE_KEY, buildId);
        void clearStaleCaches().finally(() => {
          window.location.reload();
        });
        return;
      }
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, buildId);
      }
    } catch {
      // ignore
    }
  }, []);

  return null;
}
