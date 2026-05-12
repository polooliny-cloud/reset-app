"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ensureProfileForUser } from "@/lib/profile/ensureProfile";
import {
  DEFAULT_PROFILE_STATS,
  mirrorStatsToLocal,
  normalizeStats,
  readLocalStats,
  type ProfileProgressValues,
} from "@/lib/profile/profileStats";
import { useAuth } from "@/lib/auth/useAuth";
import { supabase } from "@/lib/supabase";

const NEW_PROFILE_LS_MIGRATION_WINDOW_MS = 120_000;

type ProfileRow = {
  xp: number | null;
  level: number | null;
  victories: number | null;
  trial_started_at: string | null;
};

export type ProfileProgressContextValue = {
  xp: number;
  victories: number;
  level: number;
  /** First remote hydrate in progress; UI still uses safe numeric defaults (never null). */
  isBootstrapping: boolean;
  syncError: string | null;
  dismissSyncError: () => void;
  applyProgress: (nextXp: number, nextVictories: number) => void;
  resetProgress: () => void;
  refetchProgress: () => Promise<void>;
};

const ProfileProgressContext = createContext<ProfileProgressContextValue | null>(null);

export function useProfileProgress(): ProfileProgressContextValue {
  const ctx = useContext(ProfileProgressContext);
  if (!ctx) {
    throw new Error("useProfileProgress must be used within ProfileProgressProvider");
  }
  return ctx;
}

function shouldMigrateLocalIntoNewProfile(
  row: ProfileRow,
  lsXp: number,
  lsWins: number,
): boolean {
  if (lsXp <= 0 && lsWins <= 0) return false;
  const dbXp = row.xp ?? 0;
  const dbW = row.victories ?? 0;
  if (dbXp > 0 || dbW > 0) return false;
  if (!row.trial_started_at) return false;
  const age = Date.now() - new Date(row.trial_started_at).getTime();
  if (!Number.isFinite(age) || age < 0) return false;
  return age < NEW_PROFILE_LS_MIGRATION_WINDOW_MS;
}

export function ProfileProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [snapshot, setSnapshot] = useState<ProfileProgressValues>(DEFAULT_PROFILE_STATS);
  const snapshotRef = useRef(snapshot);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  const persistMutexTail = useRef<Promise<void>>(Promise.resolve());

  const runPersistExclusive = useCallback((fn: () => Promise<void>) => {
    const p = persistMutexTail.current.then(() => fn());
    persistMutexTail.current = p.catch(() => {});
    return p;
  }, []);

  const fetchAndResolve = useCallback(
    async (uid: string): Promise<ProfileProgressValues> => {
      const { data: row, error } = await supabase
        .from("profiles")
        .select("xp, level, victories, trial_started_at")
        .eq("id", uid)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!row) {
        return DEFAULT_PROFILE_STATS;
      }

      const profileRow = row as ProfileRow;
      const ls = readLocalStats();

      if (shouldMigrateLocalIntoNewProfile(profileRow, ls.xp, ls.victories)) {
        const merged = normalizeStats(
          Math.max(ls.xp, profileRow.xp ?? 0),
          Math.max(ls.victories, profileRow.victories ?? 0),
        );
        const { error: upErr } = await supabase
          .from("profiles")
          .update({
            xp: merged.xp,
            victories: merged.victories,
            level: merged.level,
          })
          .eq("id", uid);
        if (upErr) {
          throw new Error(upErr.message);
        }
        return merged;
      }

      return normalizeStats(profileRow.xp ?? 0, profileRow.victories ?? 0);
    },
    [],
  );

  const refetchProgress = useCallback(async () => {
    if (!userId) return;
    try {
      const next = await fetchAndResolve(userId);
      setSnapshot(next);
      mirrorStatsToLocal(next);
      setSyncError(null);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Не удалось загрузить прогресс");
    }
  }, [userId, fetchAndResolve]);

  const bootstrap = useCallback(
    async (uid: string) => {
      setIsBootstrapping(true);
      setSyncError(null);
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser || authUser.id !== uid) {
          setIsBootstrapping(false);
          return;
        }

        const ensured = await ensureProfileForUser(supabase, authUser);
        if (!ensured.ok) {
          throw new Error(ensured.error);
        }
        const next = await fetchAndResolve(authUser.id);
        setSnapshot(next);
        mirrorStatsToLocal(next);
      } catch (e) {
        setSyncError(e instanceof Error ? e.message : "Ошибка загрузки профиля");
        const fallback = normalizeStats(readLocalStats().xp, readLocalStats().victories);
        setSnapshot(fallback);
        mirrorStatsToLocal(fallback);
      } finally {
        setIsBootstrapping(false);
      }
    },
    [fetchAndResolve],
  );

  useEffect(() => {
    if (!userId) {
      setSnapshot(DEFAULT_PROFILE_STATS);
      setIsBootstrapping(false);
      return;
    }
    void bootstrap(userId);
  }, [userId, bootstrap]);

  useEffect(() => {
    if (!userId) return;
    const onOnline = () => {
      void refetchProgress();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [userId, refetchProgress]);

  const dismissSyncError = useCallback(() => setSyncError(null), []);

  const applyProgress = useCallback(
    (nextXp: number, nextVictories: number) => {
      if (!userId) return;
      const next = normalizeStats(nextXp, nextVictories);
      const prev = snapshotRef.current;
      setSnapshot(next);
      mirrorStatsToLocal(next);

      void runPersistExclusive(async () => {
        const { error } = await supabase
          .from("profiles")
          .update({
            xp: next.xp,
            victories: next.victories,
            level: next.level,
          })
          .eq("id", userId);
        if (error) {
          setSnapshot(prev);
          mirrorStatsToLocal(prev);
          setSyncError(error.message);
          await refetchProgress();
        }
      }).catch(() => {
        setSnapshot(prev);
        mirrorStatsToLocal(prev);
        setSyncError("Не удалось сохранить прогресс");
        void refetchProgress();
      });
    },
    [userId, runPersistExclusive, refetchProgress],
  );

  const resetProgress = useCallback(() => {
    if (!userId) return;
    applyProgress(0, 0);
  }, [userId, applyProgress]);

  const value = useMemo<ProfileProgressContextValue>(
    () => ({
      xp: snapshot.xp,
      victories: snapshot.victories,
      level: snapshot.level,
      isBootstrapping,
      syncError,
      dismissSyncError,
      applyProgress,
      resetProgress,
      refetchProgress,
    }),
    [
      snapshot.xp,
      snapshot.victories,
      snapshot.level,
      isBootstrapping,
      syncError,
      dismissSyncError,
      applyProgress,
      resetProgress,
      refetchProgress,
    ],
  );

  return (
    <ProfileProgressContext.Provider value={value}>
      {children}
      {syncError ? (
        <div
          className="fixed bottom-0 left-0 right-0 z-[88] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          role="alert"
        >
          <div className="surface-card flex max-w-md flex-col gap-2 px-4 py-2.5 text-center shadow-lg">
            <p className="text-xs text-[#E8E8EC]">{syncError}</p>
            <button
              type="button"
              onClick={() => {
                dismissSyncError();
                void refetchProgress();
              }}
              className="selection-card py-2 text-xs font-semibold text-white"
            >
              Обновить
            </button>
          </div>
        </div>
      ) : null}
    </ProfileProgressContext.Provider>
  );
}
