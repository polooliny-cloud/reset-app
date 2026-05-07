'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { InstallFlowModal } from './components/InstallFlowModal';
import { XpLevelBlock } from './components/XpLevelBlock';

import { incrementMetric, trackEvent } from '@/lib/analytics';
import { captureEvent } from '@/lib/posthogCapture';
import { getDaysWord } from '@/lib/utils';

const STORAGE_KEY = 'myapp_start_date';

const WINS_KEY = 'wins';
const XP_KEY = 'xp';

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
  const [screen, setScreen] = useState<HomeScreen>('home');
  const [wins, setWins] = useState(0);
  const [xp, setXp] = useState(0);
  const [daysCount, setDaysCount] = useState<number | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
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
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('days');
    localStorage.removeItem(WINS_KEY);
    localStorage.removeItem(XP_KEY);
    setWins(0);
    setXp(0);
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
    setDaysCount(deadlineDays);
    setScreen('home');
  }

  return (
    <>
      {screen === 'wins' ? (
        <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[#0B0B0C] px-4 pb-8 pt-6 sm:px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(255, 140, 0, 0.05), transparent 68%)',
            }}
          />
          <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center pt-10">
            <button
              type="button"
              onClick={() => setScreen('home')}
              aria-label="Назад"
              className="fixed left-4 z-50 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2.5 text-white/80 backdrop-blur-sm transition duration-200 ease-out hover:bg-white/10 hover:text-white sm:left-6"
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
        <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[#0B0B0C] px-4 pb-8 pt-6 sm:px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background:
                'radial-gradient(circle at 50% 35%, rgba(255, 140, 0, 0.06), transparent 64%)',
            }}
          />
          <div className="relative z-10 flex min-h-0 flex-1 flex-col pt-10">
            <button
              type="button"
              onClick={() => setScreen('home')}
              aria-label="Назад"
              className="fixed left-4 z-50 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2.5 text-white/80 backdrop-blur-sm transition duration-200 ease-out hover:bg-white/10 hover:text-white sm:left-6"
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
                      className="h-12 w-full rounded-2xl border border-white/10 bg-[#1C1C1F] px-4 text-center text-base font-semibold text-white outline-none transition duration-200 ease-out placeholder:text-[#707077] focus:border-white/20"
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
                      className="h-12 w-full rounded-2xl border border-white/10 bg-[#1C1C1F] px-4 text-center text-base font-semibold text-white outline-none transition duration-200 ease-out placeholder:text-[#707077] focus:border-white/20"
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
      <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[#0B0B0C] px-4 pt-5 pb-6 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(circle at 50% 30%, rgba(255, 140, 0, 0.08), transparent 60%)',
          }}
        />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col pt-12">
        <button
          type="button"
          onClick={() => setScreen('deadline')}
          aria-label="Срок воздержания"
          className="absolute inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#1C1C1F] text-white/85 shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition duration-200 ease-out hover:scale-[1.02] hover:bg-[#242428] active:scale-95"
          style={{ top: topInset, right: `calc(${rightInset} + 72px)` }}
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

        <button
          type="button"
          onClick={() => setScreen('wins')}
          className="absolute inline-flex origin-center cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-[#1C1C1F] px-3 py-1.5 text-[#F1B45C] shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition duration-200 ease-out hover:scale-[1.02] hover:bg-[#242428] active:scale-95"
          style={{ top: topInset, right: rightInset }}
          aria-label={`Побед: ${wins}`}
        >
          <span aria-hidden>🔥</span>
          <span className="text-base font-semibold tabular-nums text-white">{wins}</span>
        </button>

        <div
          className="absolute text-left text-2xl font-semibold text-white"
          style={{ top: topInset, left: leftInset }}
        >
          Reset
        </div>

        <div className="mx-auto mt-10 flex w-full max-w-md flex-1 flex-col pt-8">
          <div className="surface-card flex min-h-[10rem] flex-col items-center justify-center px-6 py-8">
            <StreakClock onDaysChange={setDaysCount} />
          </div>

          <div className="surface-card mt-5 p-5">
            <p className="text-flow text-base font-medium text-white">
              Перепрошивка привычки
            </p>
            <p className="text-flow mt-1 text-sm text-[#9A9AA0]">
              {(() => {
                const remainingDays = Math.max(90 - (daysCount ?? 0), 0);
                return `${remainingDays} ${getDaysWord(remainingDays)} до полной свободы`;
              })()}
            </p>
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
              className="block w-full rounded-3xl border border-amber-300/20 bg-[#1C1C1F] px-5 py-5 text-center text-lg font-semibold leading-tight text-white shadow-[0_20px_40px_rgba(0,0,0,0.35)] transition duration-200 ease-out hover:brightness-110 active:scale-[0.99]"
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
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
