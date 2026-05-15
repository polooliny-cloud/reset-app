'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { InstallFlowModal } from './components/InstallFlowModal';
import { XpLevelBlock } from './components/XpLevelBlock';

import { incrementMetric, trackEvent } from '@/lib/analytics';
import {
  MISSION_XP_REWARD,
  formatMissionCountdown,
  getMissionMeta,
  getMissionRewardTitle,
  getMissionSummary,
  resolveMissionStatus,
} from '@/lib/missions';
import { captureEvent } from '@/lib/posthogCapture';
import { PROFILE_LS_WINS_KEY, PROFILE_LS_XP_KEY } from '@/lib/profile/statsKeys';
import { useProfileProgress } from '@/lib/profile/useProfileProgress';
import { getDaysWord } from '@/lib/utils';

const STORAGE_KEY = 'myapp_start_date';

const MISSION_CLAIMED_KEY = 'mission_claimed_count';

type HomeScreen = 'home' | 'wins' | 'deadline';
const EDGE_OFFSET = 16;
const TOP_OFFSET = 8;
const ABSTINENCE_DEADLINE_DAYS_KEY = 'abstinence_deadline_days';
const ABSTINENCE_DEADLINE_HOURS_KEY = 'abstinence_deadline_hours';

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function getStreakProgress(startMs: number, nowMs: number) {
  const diff = Math.max(nowMs - startMs, 0);
  const days = Math.floor(diff / 86_400_000);
  const rest = diff % 86_400_000;
  const hours = Math.floor(rest / 3_600_000);
  const minutes = Math.floor((rest % 3_600_000) / 60_000);
  const seconds = Math.floor((rest % 60_000) / 1000);

  return {
    days,
    time: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
  };
}

function StreakClock({ onDaysChange }: { onDaysChange: (days: number) => void }) {
  const [days, setDays] = useState(0);
  const [time, setTime] = useState('00:00:00');

  useEffect(() => {
    function updateClock() {
      const nowMs = Date.now();
      let stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        stored = new Date(nowMs).toISOString();
        localStorage.setItem(STORAGE_KEY, stored);
      }
      const parsedStart = new Date(stored).getTime();
      const startMs = Number.isFinite(parsedStart) ? parsedStart : nowMs;
      if (!Number.isFinite(parsedStart)) {
        localStorage.setItem(STORAGE_KEY, new Date(startMs).toISOString());
      }

      const progress = getStreakProgress(startMs, nowMs);
      setDays(progress.days);
      setTime(progress.time);
      onDaysChange(progress.days);
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [onDaysChange]);

  return (
    <>
      <p className="text-center text-6xl font-extrabold tabular-nums tracking-[0.02em] text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.12)] sm:text-7xl">
        {days}
      </p>
      <p className="text-flow mt-3 text-sm text-[#9A9AA0]">
        {getDaysWord(days)} под контролем
      </p>
      <p className="mt-1 font-mono text-2xl tracking-wide text-white/90">{time}</p>
    </>
  );
}

export default function Home() {
  const pathname = usePathname();
  const { xp, victories, applyProgress, resetProgress } = useProfileProgress();
  const wins = victories;
  const [screen, setScreen] = useState<HomeScreen>('home');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [streakStartMs, setStreakStartMs] = useState<number | null>(null);
  const [claimedMissionCount, setClaimedMissionCount] = useState(0);
  const [daysCount, setDaysCount] = useState<number | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [missionModal, setMissionModal] = useState<'claim' | 'locked' | null>(null);
  const [showInstallFlow, setShowInstallFlow] = useState(false);
  const [deadlineDaysInput, setDeadlineDaysInput] = useState('');
  const [deadlineHoursInput, setDeadlineHoursInput] = useState('');
  const topInset = `calc(${TOP_OFFSET}px + env(safe-area-inset-top))`;
  const leftInset = `calc(${EDGE_OFFSET}px + env(safe-area-inset-left))`;
  const rightInset = `calc(${EDGE_OFFSET}px + env(safe-area-inset-right))`;

  const syncLabelFromStorage = useCallback(() => {
    const nowMs = Date.now();
    let stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      stored = new Date(nowMs).toISOString();
      localStorage.setItem(STORAGE_KEY, stored);
    }

    const parsedStart = new Date(stored).getTime();
    const startMs = Number.isFinite(parsedStart) ? parsedStart : nowMs;
    if (!Number.isFinite(parsedStart)) {
      localStorage.setItem(STORAGE_KEY, new Date(startMs).toISOString());
    }

    const progress = getStreakProgress(startMs, nowMs);
    setDaysCount(progress.days);
    setStreakStartMs(startMs);
  }, []);

  useEffect(() => {
    syncLabelFromStorage();
  }, [syncLabelFromStorage]);

  useEffect(() => {
    if (pathname !== '/') return;
    const tick = () => setNowMs(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined' || pathname !== '/') return;
    const claimed = localStorage.getItem(MISSION_CLAIMED_KEY);
    if (claimed !== null) {
      const n = Number(claimed);
      if (Number.isFinite(n) && n >= 0) setClaimedMissionCount(Math.floor(n));
    }
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined' || pathname !== '/') return;
    const storedDays = localStorage.getItem(ABSTINENCE_DEADLINE_DAYS_KEY) ?? '';
    const storedHours = localStorage.getItem(ABSTINENCE_DEADLINE_HOURS_KEY) ?? '';
    setDeadlineDaysInput(storedDays);
    setDeadlineHoursInput(storedHours);
  }, [pathname]);

  function handleConfirmReset() {
    trackEvent('reset_click');
    incrementMetric('reset_click');
    captureEvent('reset_click');
    resetProgress();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('days');
    localStorage.removeItem(PROFILE_LS_WINS_KEY);
    localStorage.removeItem(PROFILE_LS_XP_KEY);
    localStorage.removeItem(MISSION_CLAIMED_KEY);
    setClaimedMissionCount(0);
    setMissionModal(null);
    setShowResetModal(false);
    setScreen('home');
    syncLabelFromStorage();
  }

  function handleManualInstallOpen() {
    setShowInstallFlow(true);
    captureEvent('install_flow_opened');
    captureEvent('install_flow_opened_manual');
  }

  function normalizeNumericInput(value: string) {
    return value.replace(/\D/g, '');
  }

  function handleDaysChange(value: string) {
    setDeadlineDaysInput(normalizeNumericInput(value));
  }

  function handleHoursChange(value: string) {
    const normalized = normalizeNumericInput(value);
    if (normalized === '') {
      setDeadlineHoursInput('');
      return;
    }
    const numeric = Math.min(Number(normalized), 24);
    setDeadlineHoursInput(String(numeric));
  }

  const deadlineDays = Number(deadlineDaysInput || '0');
  const deadlineHours = Number(deadlineHoursInput || '0');
  const canConfirmDeadline =
    Number.isFinite(deadlineDays) &&
    Number.isFinite(deadlineHours) &&
    deadlineHours <= 24 &&
    (deadlineDays > 0 || deadlineHours > 0);

  const elapsedMs = streakStartMs ? Math.max(nowMs - streakStartMs, 0) : 0;
  const missionStatus = resolveMissionStatus(elapsedMs, claimedMissionCount);
  const missionMeta = getMissionMeta(missionStatus.missionIndex);
  const missionCountdown = formatMissionCountdown(missionStatus.missionRemainingMs);
  const missionProgressPercent = Math.floor(missionStatus.missionProgress * 100);
  const rewardMissionIndex = missionStatus.claimedCount;
  const rewardTitle = getMissionRewardTitle(rewardMissionIndex);
  const rewardSummary = getMissionSummary(rewardMissionIndex);

  useEffect(() => {
    if (missionStatus.claimedCount === claimedMissionCount) return;
    setClaimedMissionCount(missionStatus.claimedCount);
    try {
      localStorage.setItem(MISSION_CLAIMED_KEY, String(missionStatus.claimedCount));
    } catch {
      // ignore
    }
  }, [claimedMissionCount, missionStatus.claimedCount]);

  function handleOpenRewardModal() {
    if (missionStatus.pendingRewards > 0) {
      setMissionModal('claim');
      return;
    }
    setMissionModal('locked');
  }

  function handleClaimMissionReward() {
    if (missionStatus.pendingRewards <= 0) {
      setMissionModal('locked');
      return;
    }
    const nextClaimed = claimedMissionCount + 1;
    const nextXp = xp + MISSION_XP_REWARD;
    setClaimedMissionCount(nextClaimed);
    applyProgress(nextXp, victories);
    try {
      localStorage.setItem(MISSION_CLAIMED_KEY, String(nextClaimed));
    } catch {
      // ignore
    }
    setMissionModal(null);
  }

  function handleConfirmDeadline() {
    if (!canConfirmDeadline) return;
    const nowMs = Date.now();
    const offsetMs = (deadlineDays * 24 + deadlineHours) * 3_600_000;
    const startDateIso = new Date(nowMs - offsetMs).toISOString();
    try {
      localStorage.setItem(ABSTINENCE_DEADLINE_DAYS_KEY, String(deadlineDays));
      localStorage.setItem(ABSTINENCE_DEADLINE_HOURS_KEY, String(deadlineHours));
      localStorage.setItem(STORAGE_KEY, startDateIso);
    } catch {
      // ignore
    }
    const nextStartMs = nowMs - offsetMs;
    setNowMs(nowMs);
    setStreakStartMs(nextStartMs);
    setDaysCount(deadlineDays);
    setScreen('home');
  }

  return (
    <>
      {screen === 'wins' ? (
        <main className="app-shell flex min-h-screen flex-col px-4 pb-8 pt-6 sm:px-6">
          <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center pt-10">
            <button
              type="button"
              onClick={() => setScreen('home')}
              aria-label="Назад"
              className="fixed left-4 z-50 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2.5 text-white/80 transition duration-200 ease-out hover:bg-white/10 hover:text-white sm:left-6"
              style={{ top: 'calc(16px + env(safe-area-inset-top))' }}
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
              >
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="surface-card mx-auto flex w-full max-w-md flex-col p-6">
              <h1 className="text-flow-heading text-center text-lg font-medium text-[#9A9AA0]">
                Количество ваших побед
              </h1>
              <p className="mt-3 text-center text-5xl font-bold tabular-nums text-white sm:text-6xl">
                {wins} <span aria-hidden>🔥</span>
              </p>
              <XpLevelBlock xp={xp} variant="stats" />
              <div className="mt-7 border-t border-white/10 pt-5">
                <p className="text-flow text-center text-sm font-normal text-[#9A9AA0]">
                  Всего опыта
                </p>
                <p className="mt-2 text-center text-2xl font-semibold text-white">
                  {xp} xp
                </p>
              </div>
            </div>
          </div>
        </main>
      ) : screen === 'deadline' ? (
        <main className="app-shell flex min-h-screen flex-col px-4 pb-8 pt-6 sm:px-6">
          <div className="relative z-10 flex min-h-0 flex-1 flex-col pt-10">
            <button
              type="button"
              onClick={() => setScreen('home')}
              aria-label="Назад"
              className="fixed left-4 z-50 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2.5 text-white/80 transition duration-200 ease-out hover:bg-white/10 hover:text-white sm:left-6"
              style={{ top: 'calc(16px + env(safe-area-inset-top))' }}
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
              >
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="mx-auto mt-10 flex w-full max-w-md flex-1 flex-col pt-8">
              <h1 className="text-flow-heading text-center text-2xl font-semibold text-white">
                Выставь срок своего воздержания
              </h1>
              <p className="text-flow mt-3 text-center text-sm text-[#9A9AA0]">
                Если ты уже в процессе воздержания
              </p>

              <div className="surface-card mt-8 p-5">
                <div className="mx-auto flex max-w-[18rem] items-end justify-center gap-3">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <label
                      htmlFor="deadline-days"
                      className="text-flow mb-2 text-center text-xs text-[#9A9AA0]"
                    >
                      Дни
                    </label>
                    <input
                      id="deadline-days"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={deadlineDaysInput}
                      onChange={(e) => handleDaysChange(e.target.value)}
                      placeholder="0"
                      className="glass-input h-12 w-full px-4 text-center text-base font-semibold text-white outline-none transition duration-200 ease-out placeholder:text-slate-500 focus:border-violet-300/40"
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <label
                      htmlFor="deadline-hours"
                      className="text-flow mb-2 text-center text-xs text-[#9A9AA0]"
                    >
                      Часы
                    </label>
                    <input
                      id="deadline-hours"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={deadlineHoursInput}
                      onChange={(e) => handleHoursChange(e.target.value)}
                      placeholder="0"
                      className="glass-input h-12 w-full px-4 text-center text-base font-semibold text-white outline-none transition duration-200 ease-out placeholder:text-slate-500 focus:border-violet-300/40"
                    />
                  </div>
                </div>
              </div>

              {canConfirmDeadline ? (
                <button type="button" onClick={handleConfirmDeadline} className="primary-cta mt-6">
                  Подтвердить
                </button>
              ) : null}
            </div>
          </div>
        </main>
      ) : (
      <main className="app-shell flex min-h-screen flex-col px-4 pb-6 pt-5 sm:px-6">
        <div className="relative z-10 flex min-h-0 flex-1 flex-col pt-12">
        <div
          className="absolute z-40 flex flex-row-reverse items-center gap-2"
          style={{ top: topInset, right: rightInset }}
        >
          <button
            type="button"
            onClick={() => setScreen('wins')}
            className="inline-flex origin-center cursor-pointer items-center gap-1.5 rounded-full border border-slate-300/20 bg-slate-900/78 px-3 py-1.5 text-violet-300 shadow-[0_8px_18px_rgba(2,6,23,0.35)] transition duration-200 ease-out hover:bg-slate-800/82 active:scale-95"
            aria-label={`Побед: ${wins}`}
          >
            <span aria-hidden>🔥</span>
            <span className="text-base font-semibold tabular-nums text-white">{wins}</span>
          </button>

          <button
            type="button"
            onClick={() => setScreen('deadline')}
            aria-label="Срок воздержания"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300/20 bg-slate-900/78 text-slate-100/90 shadow-[0_8px_18px_rgba(2,6,23,0.35)] transition duration-200 ease-out hover:bg-slate-800/82 active:scale-95"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
              <circle
                cx="12"
                cy="12"
                r="8.25"
                stroke="currentColor"
                strokeWidth="1.8"
                opacity="0.9"
              />
              <path
                d="M12 8.5V12L14.8 13.8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <Link
            href="/settings"
            aria-label="Настройки"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300/20 bg-slate-900/78 text-slate-100/90 shadow-[0_8px_18px_rgba(2,6,23,0.35)] transition duration-200 ease-out hover:bg-slate-800/82 active:scale-95"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
              <circle
                cx="12"
                cy="9"
                r="3.25"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <path
                d="M5.25 19.25c0-3.45 2.9-6.25 6.75-6.25s6.75 2.8 6.75 6.25"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </Link>
        </div>

        <div
          className="absolute text-left text-sm uppercase tracking-[0.18em] text-white/75"
          style={{ top: topInset, left: leftInset }}
        >
          Reset
        </div>

        <div className="mx-auto mt-10 flex w-full max-w-md flex-1 flex-col pt-8">
          <div className="surface-card flex min-h-[10rem] flex-col items-center justify-center px-6 py-8">
            <StreakClock onDaysChange={setDaysCount} />
          </div>

          <div className="surface-card mt-5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-flow text-lg font-semibold text-white">Твоё задание</p>
                <p className="text-flow mt-2 text-sm text-[#B0B8C8]">Продержаться:</p>
              </div>
              <button
                type="button"
                onClick={handleOpenRewardModal}
                className="selection-card min-h-0 shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-white transition duration-200 ease-out hover:bg-slate-800/70"
              >
                Награда
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                {missionStatus.pendingRewards > 0 ? (
                  <p className="text-flow text-base font-medium text-violet-200">Забери награду</p>
                ) : (
                  <p className="font-mono text-2xl tracking-[0.02em] text-white">{missionCountdown}</p>
                )}
                <p className="text-flow mt-1 text-xs text-[#9A9AA0]">
                  {missionMeta.title} · {missionMeta.durationLabel}
                </p>
              </div>
              {missionStatus.pendingRewards > 1 ? (
                <span className="rounded-full border border-violet-300/35 bg-violet-500/15 px-2.5 py-1 text-xs text-violet-100">
                  +{missionStatus.pendingRewards - 1} в очереди
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#2A2A2E]">
                <div
                  className="h-full transition-all duration-500 ease-out"
                  style={{
                    width: `${missionProgressPercent}%`,
                    background:
                      'linear-gradient(90deg, rgb(139 92 246), rgb(167 139 250), rgb(196 181 253))',
                  }}
                />
              </div>
              <span className="min-w-[42px] text-right text-xs text-[#9A9AA0]">
                {missionProgressPercent}%
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-1 sm:justify-between">
            <button
              type="button"
              onClick={handleManualInstallOpen}
              className="secondary-link !w-auto"
            >
              Скачать
            </button>
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="secondary-link !w-auto"
            >
              Сбросить
            </button>
          </div>

          <div className="mt-auto w-full pb-[calc(32px+env(safe-area-inset-bottom))] pt-6">
            <Link
              href="/sos"
              onClick={() => {
                trackEvent('sos_click');
                incrementMetric('sos_click');
                captureEvent('sos_click');
              }}
              className="block w-full rounded-3xl border border-violet-300/30 bg-slate-900/80 px-5 py-5 text-center text-lg font-semibold leading-tight text-white shadow-[0_14px_30px_rgba(2,6,23,0.38)] transition duration-200 ease-out hover:brightness-110 active:scale-[0.99]"
            >
              Тревожная кнопка
            </Link>
          </div>
        </div>
        </div>
      </main>
      )}

      {showResetModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#070a12]/72 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
        >
          <div className="surface-card w-full max-w-sm p-6">
            <div
              id="reset-modal-title"
              className="text-center text-base text-white"
            >
              <p className="text-flow mb-0">
                Ты точно хочешь сбросить свой прогресс?
              </p>
              <p className="text-flow mb-0 mt-2">
                Если ты сорвался — будь честен перед собой.
              </p>
            </div>
            <div className="mt-6 flex flex-row gap-3">
              <button
                type="button"
                onClick={handleConfirmReset}
                className="glass-danger flex-1 py-3 text-base font-semibold text-white transition duration-200 ease-out hover:brightness-110"
              >
                Сбросить
              </button>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="selection-card flex-1 py-3 text-base font-semibold text-white"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {missionModal === 'claim' ? (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-[#070a12]/72 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mission-reward-title"
        >
          <div className="surface-card w-full max-w-sm p-6">
            <p id="mission-reward-title" className="text-flow text-center text-base font-medium text-white">
              {rewardTitle}
            </p>
            <p className="text-flow mt-3 text-center text-sm text-[#D4D4D8]">{rewardSummary}</p>
            <button
              type="button"
              onClick={handleClaimMissionReward}
              className="primary-cta mt-6"
            >
              Забрать 54xp
            </button>
          </div>
        </div>
      ) : null}

      {missionModal === 'locked' ? (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-[#070a12]/72 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mission-locked-title"
        >
          <div className="surface-card w-full max-w-sm p-6">
            <p id="mission-locked-title" className="text-flow text-center text-base font-medium text-white">
              Задание не выполнено
            </p>
            <p className="text-flow mt-3 text-center text-sm text-[#D4D4D8]">
              Нам нравится твоё стремление. Оставайся таким же мотивированным и не забывай, зачем ты это делаешь. Возвращайся сюда, когда выполнишь задание и забирай награду.
            </p>
            <button
              type="button"
              onClick={() => setMissionModal(null)}
              className="selection-card mt-6 w-full py-3 text-base font-semibold text-white"
            >
              Закрыть
            </button>
          </div>
        </div>
      ) : null}

      <InstallFlowModal
        open={showInstallFlow}
        onClose={() => setShowInstallFlow(false)}
        onFinish={() => setShowInstallFlow(false)}
        mode="manual"
        onPlatformSelect={(platform) =>
          captureEvent('install_platform_selected', { platform })
        }
      />
    </>
  );
}
