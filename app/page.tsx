'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { XpLevelBlock } from './components/XpLevelBlock';

import { incrementMetric, trackEvent } from '@/lib/analytics';
import { posthogCapture } from '@/lib/posthogCapture';

const STORAGE_KEY = 'myapp_start_date';
const CLAIMED_MEDALS_KEY = 'claimedMedals';

const REWARD_THRESHOLDS = [3, 7, 14, 21, 30] as const;

const WINS_KEY = 'wins';
const XP_KEY = 'xp';

type HomeScreen = 'home' | 'wins';

function daysBetweenCalendar(a: Date, b: Date): number {
  const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((b0.getTime() - a0.getTime()) / 86_400_000);
}

function formatDaysRu(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} день`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    return `${n} дня`;
  return `${n} дней`;
}

/** 0–2: нет эмодзи; иначе медаль по диапазону дней. */
function medalEmoji(days: number): string | null {
  if (days <= 2) return null;
  if (days <= 6) return '🥉';
  if (days <= 13) return '🥈';
  if (days <= 20) return '🥇';
  if (days <= 29) return '🏅';
  return '🏆';
}

function medalEmojiForThreshold(level: number): string {
  switch (level) {
    case 3:
      return '🥉';
    case 7:
      return '🥈';
    case 14:
      return '🥇';
    case 21:
      return '🏅';
    case 30:
      return '🏆';
    default:
      return '🏅';
  }
}

function readClaimedMedals(): number[] {
  try {
    const raw = localStorage.getItem(CLAIMED_MEDALS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const set = new Set(REWARD_THRESHOLDS);
    return parsed.filter(
      (x): x is number =>
        typeof x === 'number' && Number.isInteger(x) && set.has(x as (typeof REWARD_THRESHOLDS)[number]),
    );
  } catch {
    return [];
  }
}

function writeClaimedMedals(ids: number[]) {
  const unique = [...new Set(ids)].sort((a, b) => a - b);
  localStorage.setItem(CLAIMED_MEDALS_KEY, JSON.stringify(unique));
}

function findNextUnclaimedReward(
  days: number,
  claimed: number[],
): number | null {
  for (const t of REWARD_THRESHOLDS) {
    if (days >= t && !claimed.includes(t)) return t;
  }
  return null;
}

export default function Home() {
  const pathname = usePathname();
  const [screen, setScreen] = useState<HomeScreen>('home');
  const [wins, setWins] = useState(0);
  const [xp, setXp] = useState(0);
  const [daysLabel, setDaysLabel] = useState<string | null>(null);
  const [daysCount, setDaysCount] = useState<number | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [pendingRewardLevel, setPendingRewardLevel] = useState<number | null>(
    null,
  );
  const [showResetModal, setShowResetModal] = useState(false);

  const syncLabelFromStorage = useCallback(() => {
    const now = new Date();
    let stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      stored = now.toISOString();
      localStorage.setItem(STORAGE_KEY, stored);
    }
    const start = new Date(stored);
    const days = daysBetweenCalendar(start, now);
    setDaysCount(days);
    setDaysLabel(formatDaysRu(days));
  }, []);

  useEffect(() => {
    syncLabelFromStorage();
  }, [syncLabelFromStorage]);

  useEffect(() => {
    if (typeof window === 'undefined' || pathname !== '/') return;
    const w = localStorage.getItem(WINS_KEY);
    const x = localStorage.getItem(XP_KEY);
    if (w !== null) {
      const n = Number(w);
      if (Number.isFinite(n)) setWins(n);
    }
    if (x !== null) {
      const n = Number(x);
      if (Number.isFinite(n)) setXp(n);
    }
  }, [pathname]);

  const evaluateRewardModal = useCallback((days: number) => {
    const claimed = readClaimedMedals();
    const next = findNextUnclaimedReward(days, claimed);
    if (next !== null) {
      setPendingRewardLevel(next);
      setShowRewardModal(true);
    } else {
      setShowRewardModal(false);
      setPendingRewardLevel(null);
    }
  }, []);

  useEffect(() => {
    if (daysCount === null) return;
    evaluateRewardModal(daysCount);
  }, [daysCount, evaluateRewardModal]);

  function handleClaimReward() {
    if (pendingRewardLevel === null) return;
    const claimed = readClaimedMedals();
    if (!claimed.includes(pendingRewardLevel)) {
      claimed.push(pendingRewardLevel);
      writeClaimedMedals(claimed);
    }
    setShowRewardModal(false);
    setPendingRewardLevel(null);
    if (daysCount !== null) {
      const next = findNextUnclaimedReward(daysCount, readClaimedMedals());
      if (next !== null) {
        setPendingRewardLevel(next);
        setShowRewardModal(true);
      }
    }
  }

  function handleConfirmReset() {
    trackEvent('reset_click');
    incrementMetric('reset_click');
    posthogCapture('reset_click');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('days');
    localStorage.removeItem(CLAIMED_MEDALS_KEY);
    localStorage.removeItem(WINS_KEY);
    localStorage.removeItem(XP_KEY);
    setWins(0);
    setXp(0);
    setShowRewardModal(false);
    setPendingRewardLevel(null);
    setShowResetModal(false);
    setScreen('home');
    syncLabelFromStorage();
  }

  const medal =
    daysCount === null ? undefined : medalEmoji(daysCount);

  return (
    <>
      {screen === 'wins' ? (
        <main className="min-h-screen bg-[#0B0B0C] px-4 pb-8 pt-6 sm:px-6">
          <button
            type="button"
            onClick={() => setScreen('home')}
            className="inline-flex items-center gap-2 self-start rounded-xl px-2 py-2 text-[#9A9AA0] transition-colors duration-200 ease-out hover:bg-[#1C1C1F] hover:text-white"
          >
            <span aria-hidden className="text-xl leading-none">
              ←
            </span>
            <span className="text-base font-medium">Назад</span>
          </button>

          <div className="mx-auto mt-8 flex w-full max-w-md flex-col rounded-3xl border border-white/5 bg-[#151517] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
            <h1 className="text-center text-lg font-medium text-[#9A9AA0]">
              Количество ваших побед
            </h1>
            <p className="mt-3 text-center text-5xl font-bold tabular-nums text-white sm:text-6xl">
              {wins} <span aria-hidden>🔥</span>
            </p>
            <XpLevelBlock xp={xp} variant="stats" />
            <div className="mt-7 border-t border-white/10 pt-5">
              <p className="text-center text-sm font-normal text-[#9A9AA0]">
                Всего опыта
              </p>
              <p className="mt-2 text-center text-2xl font-semibold text-white">
                {xp} xp
              </p>
            </div>
          </div>
        </main>
      ) : (
      <main className="relative min-h-screen bg-[#0B0B0C] px-4 pb-6 pt-5 sm:px-6">
        <button
          type="button"
          onClick={() => setScreen('wins')}
          className="absolute right-4 top-5 inline-flex origin-center cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-[#1C1C1F] px-3 py-1.5 text-[#F1B45C] shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition duration-200 ease-out hover:scale-[1.02] hover:bg-[#242428] active:scale-95"
          aria-label={`Побед: ${wins}`}
        >
          <span aria-hidden>🔥</span>
          <span className="text-base font-semibold tabular-nums text-white">{wins}</span>
        </button>

        <div className="w-full pt-2 text-left text-2xl font-semibold text-white">
          Reset
        </div>

        <div className="mx-auto mt-10 flex w-full max-w-md flex-col">
          <div className="flex min-h-[10rem] flex-col items-center justify-center rounded-3xl border border-white/5 bg-[#151517] px-6 py-8 shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
            <p className="text-5xl font-bold tabular-nums tracking-tight text-white sm:text-6xl">
              {daysCount ?? '…'}
            </p>
            <p className="mt-3 text-sm text-[#9A9AA0]">дней под контролем</p>
            {medal ? (
              <span className="mt-4 text-3xl leading-none" role="img" aria-label="Награда">
                {medal}
              </span>
            ) : null}
          </div>

          <div className="mt-5 rounded-3xl border border-white/5 bg-[#151517] p-5 shadow-[0_16px_36px_rgba(0,0,0,0.3)]">
            <p className="text-base font-medium text-white">Перепрошивка привычки</p>
            <p className="mt-1 text-sm text-[#9A9AA0]">90 дней до полной свободы</p>
            {(() => {
              const days = daysCount ?? 0;
              const brainPercent = Math.min((days / 90) * 100, 100);
              return (
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#2A2A2E]">
                    <div
                      className="h-full transition-all duration-500 ease-out"
                      style={{
                        width: `${brainPercent}%`,
                        background:
                          'linear-gradient(90deg, rgb(245 158 11), rgb(249 115 22), rgb(234 88 12))',
                      }}
                    />
                  </div>
                  <span className="min-w-[42px] text-right text-xs text-[#9A9AA0]">
                    {Math.floor(brainPercent)}%
                  </span>
                </div>
              );
            })()}
          </div>

          <div className="mt-4 flex items-center justify-between px-1">
            <p className="text-sm text-[#9A9AA0]">{daysLabel ?? '…'}</p>
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="text-sm text-[#9A9AA0] underline underline-offset-4 transition-colors duration-200 ease-out hover:text-white"
            >
              Сбросить
            </button>
          </div>

          <Link
            href="/sos"
            onClick={() => {
              trackEvent('sos_click');
              incrementMetric('sos_click');
              posthogCapture('sos_click');
            }}
            className="mt-8 block w-full rounded-3xl border border-amber-300/20 bg-[#1C1C1F] px-5 py-5 text-center text-lg font-semibold leading-tight text-white shadow-[0_20px_40px_rgba(0,0,0,0.35)] transition duration-200 ease-out hover:brightness-110 active:scale-[0.99]"
          >
            У меня импульс
          </Link>
        </div>
      </main>
      )}

      {showRewardModal && pendingRewardLevel !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reward-modal-title"
        >
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#151517] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <p
              id="reward-modal-title"
              className="text-center text-base font-medium text-white"
            >
              Поздравляем! Вы можете забрать свою награду
            </p>
            <div className="my-6 flex justify-center text-7xl leading-none">
              {medalEmojiForThreshold(pendingRewardLevel)}
            </div>
            <button
              type="button"
              onClick={handleClaimReward}
                className="w-full rounded-2xl bg-[#1C1C1F] py-3 text-base font-semibold text-white transition duration-200 ease-out hover:bg-[#242428]"
            >
              Забрать награду
            </button>
          </div>
        </div>
      )}

      {showResetModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
        >
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#151517] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <div
              id="reset-modal-title"
              className="text-center text-base leading-snug text-white"
            >
              <p className="mb-0">Ты точно хочешь сбросить свой прогресс?</p>
              <p className="mb-0 mt-2">
                Если ты сорвался — будь честен перед собой.
              </p>
            </div>
            <div className="mt-6 flex flex-row gap-3">
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 rounded-2xl bg-[#8A3E18] py-3 text-base font-semibold text-white transition duration-200 ease-out hover:bg-[#9A4920]"
              >
                Сбросить
              </button>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 rounded-2xl border border-white/15 bg-[#1C1C1F] py-3 text-base font-semibold text-white transition duration-200 ease-out hover:bg-[#26262A]"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
