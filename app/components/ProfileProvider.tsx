"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ensureProfileForUser } from "@/lib/profile/ensureProfile";
import { grantVictory } from "@/lib/profile/grantVictory";
import { useAuth } from "@/lib/auth/useAuth";
import { supabase } from "@/lib/supabase";

export type AppProfile = {
  id: string;
  email: string | null;
  onboarding_completed: boolean;
};

export type ProfileStateValue = {
  /** True while loading / ensuring profile for the current user. */
  profileLoading: boolean;
  /** True when auth + profile hydration finished (app may route). */
  appReady: boolean;
  profile: AppProfile | null;
  onboardingCompleted: boolean;
  profileError: string | null;
  refetchProfile: () => Promise<void>;
  markOnboardingCompleted: () => Promise<{ ok: boolean; error?: string }>;
  resetOnboardingInDb: () => Promise<{ ok: boolean; error?: string }>;
};

const ProfileStateContext = createContext<ProfileStateValue | null>(null);

export function useProfileState(): ProfileStateValue {
  const ctx = useContext(ProfileStateContext);
  if (!ctx) {
    throw new Error("useProfileState must be used within ProfileProvider");
  }
  return ctx;
}

function GateSpinner() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-[#090d14]">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-violet-300"
        aria-hidden
      />
    </div>
  );
}

async function fetchProfileRow(userId: string): Promise<AppProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, onboarding_completed")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Профиль не найден");
  }

  const completed = data.onboarding_completed === true;
  console.log("[profile] profile loaded", userId, { onboarding_completed: completed });
  console.log("[profile] onboarding status", completed ? "completed" : "incomplete");

  return {
    id: data.id,
    email: data.email,
    onboarding_completed: completed,
  };
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, initializing: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async (uid: string) => {
    setProfileLoading(true);
    setProfileError(null);

    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser || authUser.id !== uid) {
        setProfile(null);
        return;
      }

      const ensured = await ensureProfileForUser(supabase, authUser);
      if (!ensured.ok) {
        throw new Error(ensured.error);
      }

      const row = await fetchProfileRow(uid);
      setProfile(row);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Не удалось загрузить профиль";
      console.error("[profile] profile fetch failed", message);
      setProfileError(message);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      setProfile(null);
      setProfileError(null);
      setProfileLoading(false);
      return;
    }

    void loadProfile(userId);
  }, [authLoading, userId, loadProfile]);

  const refetchProfile = useCallback(async () => {
    if (!userId) return;
    await loadProfile(userId);
  }, [userId, loadProfile]);

  const markOnboardingCompleted = useCallback(async () => {
    if (!userId) {
      return { ok: false, error: "Нужна авторизация" };
    }

    const victory = await grantVictory({
      userId,
      trigger: "onboarding_complete",
      xp: 50,
    });

    if (!victory.ok) {
      console.error("[profile] onboarding victory failed", victory.error);
      return { ok: false, error: victory.error };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", userId);

    if (error) {
      console.error("[profile] onboarding completed update failed", error.message, error);
      return { ok: false, error: error.message };
    }

    console.log("[profile] onboarding completed updated", userId);
    setProfile((prev) =>
      prev ? { ...prev, onboarding_completed: true } : { id: userId, email: null, onboarding_completed: true },
    );
    return { ok: true };
  }, [userId]);

  const resetOnboardingInDb = useCallback(async () => {
    if (!userId) {
      return { ok: false, error: "Нужна авторизация" };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed: false })
      .eq("id", userId);

    if (error) {
      console.error("[profile] onboarding reset failed", error.message, error);
      return { ok: false, error: error.message };
    }

    console.log("[profile] onboarding reset in db", userId);
    setProfile((prev) =>
      prev ? { ...prev, onboarding_completed: false } : null,
    );
    return { ok: true };
  }, [userId]);

  const appReady = !authLoading && !profileLoading;

  const value = useMemo<ProfileStateValue>(
    () => ({
      profileLoading,
      appReady,
      profile,
      onboardingCompleted: profile?.onboarding_completed ?? false,
      profileError,
      refetchProfile,
      markOnboardingCompleted,
      resetOnboardingInDb,
    }),
    [
      profileLoading,
      appReady,
      profile,
      profileError,
      refetchProfile,
      markOnboardingCompleted,
      resetOnboardingInDb,
    ],
  );

  if (authLoading || (userId && profileLoading)) {
    return <GateSpinner />;
  }

  if (userId && profileError) {
    return (
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-[#090d14] px-4">
        <div className="surface-card max-w-md px-5 py-6 text-center">
          <p className="text-sm text-[#E8E8EC]">{profileError}</p>
          <button
            type="button"
            onClick={() => void refetchProfile()}
            className="selection-card mt-4 min-w-[10rem] py-2.5 text-sm font-semibold text-white"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return <ProfileStateContext.Provider value={value}>{children}</ProfileStateContext.Provider>;
}
