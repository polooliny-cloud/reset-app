export type OnboardingFlowStage = "goals" | "sosDemo" | "install" | "installInstruction";

export type OnboardingProgress = {
  userId: string;
  selectedGoals: string[];
  sosDemoCompleted: boolean;
  reachedInstall: boolean;
};

const STORAGE_KEY = "reset_onboarding_progress_v1";

function emptyProgress(userId: string): OnboardingProgress {
  return {
    userId,
    selectedGoals: [],
    sosDemoCompleted: false,
    reachedInstall: false,
  };
}

export function loadOnboardingProgress(userId: string): OnboardingProgress {
  if (typeof window === "undefined") return emptyProgress(userId);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress(userId);
    const parsed = JSON.parse(raw) as Partial<OnboardingProgress>;
    if (parsed.userId !== userId) return emptyProgress(userId);
    return {
      userId,
      selectedGoals: Array.isArray(parsed.selectedGoals)
        ? parsed.selectedGoals.filter((item): item is string => typeof item === "string")
        : [],
      sosDemoCompleted: parsed.sosDemoCompleted === true,
      reachedInstall: parsed.reachedInstall === true,
    };
  } catch {
    return emptyProgress(userId);
  }
}

export function saveOnboardingProgress(progress: OnboardingProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

export function clearOnboardingProgress(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function resumeOnboardingStage(progress: OnboardingProgress): OnboardingFlowStage {
  if (progress.reachedInstall || progress.sosDemoCompleted) return "install";
  if (progress.selectedGoals.length > 0) return "sosDemo";
  return "goals";
}
