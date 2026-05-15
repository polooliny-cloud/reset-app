"use client";

import { useEffect } from "react";

const STORAGE_KEY = "reset_app_build_id";

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
        window.location.reload();
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
