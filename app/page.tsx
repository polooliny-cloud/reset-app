'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { incrementMetric, trackEvent } from '@/lib/analytics';

const STORAGE_KEY = 'myapp_start_date';
const CLAIMED_MEDALS_KEY = 'claimedMedals';

const REWARD_THRESHOLDS = [3, 7, 14, 21, 30] as const;

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
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CLAIMED_MEDALS_KEY);
    syncLabelFromStorage();
    setShowResetModal(false);
  }

  const medal =
    daysCount === null ? undefined : medalEmoji(daysCount);
  const progressPercent =
    daysCount === null
      ? 0
      : Math.min(100, Math.round((daysCount / 90) * 100));
  const progressColorClass =
    progressPercent <= 33
      ? 'bg-red-500'
      : progressPercent <= 66
        ? 'bg-yellow-400'
        : 'bg-green-500';

  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-between p-6">
        {/* Header */}
        <div className="w-full self-start pl-3 pt-3 text-left text-2xl font-bold">
          Reset
        </div>

        {/* Center */}
        <div className="flex w-full max-w-md flex-col items-center">
          <div className="mb-4 flex min-h-[5.5rem] flex-col items-center justify-center">
            {daysCount === null ? (
              <span className="text-6xl leading-none text-gray-300" aria-hidden>
                …
              </span>
            ) : medal ? (
              <span
                className="text-7xl leading-none sm:text-8xl"
                role="img"
                aria-label="Награда"
              >
                {medal}
              </span>
            ) : (
              <p className="max-w-[16rem] text-center text-base leading-snug text-gray-500">
                Тут появятся ваши награды
              </p>
            )}
          </div>
          <div className="text-center text-sm font-normal text-gray-500">
            Вы воздерживаетесь в течение:
          </div>
          <div className="text-2xl font-semibold">
            {daysLabel ?? '…'}
          </div>
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="mt-3 text-sm text-gray-600 underline underline-offset-2 hover:text-gray-900"
          >
            Сбросить
          </button>

          <div className="mt-6 w-full text-center">
            <p className="text-base font-medium text-gray-900">
              Переключение мозга
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-3 flex-1 rounded-full bg-gray-200">
                <div
                  className={`h-3 rounded-full ${progressColorClass}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="min-w-11 text-sm font-medium text-gray-700">
                {progressPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Тревожная кнопка */}
        <Link
          href="/sos"
          onClick={() => {
            trackEvent('sos_click');
            incrementMetric('sos_click');
          }}
          className="block w-full rounded-xl bg-red-600 px-3 py-4 text-center text-base font-bold leading-tight text-white sm:text-lg"
        >
          Тревожная кнопка
        </Link>
      </main>

      {showRewardModal && pendingRewardLevel !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reward-modal-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <p
              id="reward-modal-title"
              className="text-center text-base font-medium text-gray-900"
            >
              Поздравляем! Вы можете забрать свою награду
            </p>
            <div className="my-6 flex justify-center text-7xl leading-none">
              {medalEmojiForThreshold(pendingRewardLevel)}
            </div>
            <button
              type="button"
              onClick={handleClaimReward}
              className="w-full rounded-xl bg-gray-900 py-3 text-base font-semibold text-white transition hover:bg-gray-800"
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
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div
              id="reset-modal-title"
              className="text-center text-base leading-snug text-gray-900"
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
                className="flex-1 rounded-xl bg-red-600 py-3 text-base font-semibold text-white transition hover:bg-red-700"
              >
                Сбросить
              </button>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 rounded-xl border border-gray-300 bg-white py-3 text-base font-semibold text-gray-900 transition hover:bg-gray-50"
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
