import type { PremiumState } from "@/lib/billing/types";
import { FREE_TRIAL_DAYS } from "@/lib/billing/types";

export type PremiumStatusKind = "trial" | "premium" | "none";

export function getPremiumStatusKind(state: PremiumState): PremiumStatusKind {
  if (!state.isPremium) return "none";
  if (state.isTrial) return "trial";
  return "premium";
}

export function getDaysRemaining(untilIso: string | null, nowMs = Date.now()): number | null {
  if (!untilIso) return null;
  const untilMs = new Date(untilIso).getTime();
  if (!Number.isFinite(untilMs)) return null;
  const diff = untilMs - nowMs;
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86_400_000);
}

function formatDateRu(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function getPremiumHeaderCopy(state: PremiumState): {
  title: string;
  subtitle: string;
} {
  const kind = getPremiumStatusKind(state);

  if (kind === "trial" && state.premiumUntil) {
    const days = getDaysRemaining(state.premiumUntil);
    const trialDaysValid =
      days !== null && days >= 0 && days <= FREE_TRIAL_DAYS + 1;

    if (trialDaysValid) {
      const daysLabel =
        days === 0
          ? "Заканчивается сегодня"
          : days === 1
            ? "Остался 1 день"
            : `Осталось ${days} ${days === 2 || days === 3 || days === 4 ? "дня" : "дней"}`;
      return {
        title: "Пробный период активен",
        subtitle: `${daysLabel} · до ${formatDateRu(state.premiumUntil)}`,
      };
    }

    return {
      title: "Пробный период активен",
      subtitle: `Действует до ${formatDateRu(state.premiumUntil)}`,
    };
  }

  if (kind === "premium" && state.premiumUntil) {
    return {
      title: "Premium активен",
      subtitle: `Действует до ${formatDateRu(state.premiumUntil)}`,
    };
  }

  if (kind === "premium") {
    return {
      title: "Premium активен",
      subtitle: "Полный доступ ко всем функциям",
    };
  }

  return {
    title: "Premium не активен",
    subtitle: "Оформите подписку, чтобы открыть все инструменты",
  };
}

export function getPremiumChipLabel(state: PremiumState): string | null {
  const kind = getPremiumStatusKind(state);
  if (kind === "trial") {
    const days = getDaysRemaining(state.premiumUntil);
    if (days === null) return "Trial";
    if (days === 0) return "Trial · сегодня";
    return `Trial · ${days} дн.`;
  }
  if (kind === "premium") return "Premium";
  return null;
}
