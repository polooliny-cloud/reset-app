"use client";

import { useEffect, useState } from "react";

import {
  DEV_NAV_BYPASS_CHANGE_EVENT,
  isDevNavBypassActive,
} from "@/lib/dev/localNav";

/** Reads sessionStorage on every render; re-renders when bypass toggles (localhost dev only). */
export function useDevNavBypass(): boolean {
  const [, bump] = useState(0);

  useEffect(() => {
    function sync() {
      bump((n) => n + 1);
    }

    window.addEventListener(DEV_NAV_BYPASS_CHANGE_EVENT, sync);
    return () => window.removeEventListener(DEV_NAV_BYPASS_CHANGE_EVENT, sync);
  }, []);

  if (typeof window === "undefined") return false;
  return isDevNavBypassActive();
}
