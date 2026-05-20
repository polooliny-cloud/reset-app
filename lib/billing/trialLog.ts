type TrialLogLevel = "info" | "warn" | "error";

/** Trial-only logs — never used by paid Lava checkout flow. */
export function trialLog(
  event: string,
  data?: Record<string, unknown>,
  level: TrialLogLevel = "info",
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    event,
    ...data,
  });

  if (level === "error") {
    console.error("[trial]", line);
    return;
  }
  if (level === "warn") {
    console.warn("[trial]", line);
    return;
  }
  console.log("[trial]", line);
}
