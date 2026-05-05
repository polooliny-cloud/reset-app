'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { InstallFlowModal } from './components/InstallFlowModal';
import { XpLevelBlock } from './components/XpLevelBlock';

import { incrementMetric, trackEvent } from '@/lib/analytics';
import { ONBOARDING_COMPLETED_KEY } from '@/lib/onboarding';
import { captureEvent } from '@/lib/posthogCapture';
import { getDaysWord } from '@/lib/utils';

const STORAGE_KEY = 'myapp_start_date';

const WINS_KEY = 'wins';
const XP_KEY = 'xp';
const INSTALL_PROMPT_SHOWN_KEY = 'install_prompt_shown';
const LAST_INSTALL_PROMPT_KEY = 'last_install_prompt';
const SESSION_COUNT_KEY = 'session_count';
const PROMPT_MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;
const INSTALL_PROMPT_MAX_SHOWN = 3;

type HomeScreen = 'home' | 'wins';
const EDGE_OFFSET = 16;
const TOP_OFFSET = 8;

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

function parseStoredNumber(value: string | null, fallback = 0) {
  if (value === null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isInstalledApp() {
  if (typeof window === 'undefined') return false;
  const standaloneMedia =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  );
  return standaloneMedia || iosStandalone;
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
      <p className="text-flow mt-3 text-sm leading-[1.45] text-[#9A9AA0]">
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
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showInstallFlow, setShowInstallFlow] = useState(false);
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
    if (isInstalledApp()) return;

    const onboardingDone =
      localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
    if (!onboardingDone) return;

    const sessionCount = parseStoredNumber(localStorage.getItem(SESSION_COUNT_KEY));
    const nextSessionCount = sessionCount + 1;
    localStorage.setItem(SESSION_COUNT_KEY, String(nextSessionCount));

    const installPromptShown = parseStoredNumber(
      localStorage.getItem(INSTALL_PROMPT_SHOWN_KEY),
    );
    const lastPromptTs = parseStoredNumber(localStorage.getItem(LAST_INSTALL_PROMPT_KEY));
    const enoughTimePassed =
      lastPromptTs === 0 || Date.now() - lastPromptTs >= PROMPT_MIN_INTERVAL_MS;
    const canShow = installPromptShown < INSTALL_PROMPT_MAX_SHOWN;
    const isRepeatVisit = nextSessionCount > 1;

    if (!isRepeatVisit || !enoughTimePassed || !canShow) return;

    localStorage.setItem(
      INSTALL_PROMPT_SHOWN_KEY,
      String(installPromptShown + 1),
    );
    setShowInstallPrompt(true);
    captureEvent('install_prompt_seen');
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

  function handleInstallDismiss() {
    setShowInstallPrompt(false);
    localStorage.setItem(LAST_INSTALL_PROMPT_KEY, String(Date.now()));
    captureEvent('install_dismissed');
  }

  function handleInstallClick() {
    setShowInstallPrompt(false);
    setShowInstallFlow(true);
    captureEvent('install_clicked');
    captureEvent('install_flow_opened');
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

            <div className="mx-auto flex w-full max-w-md flex-col rounded-3xl border border-white/5 bg-[#151517] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
              <h1 className="text-flow-heading text-center text-lg font-medium leading-[1.45] text-[#9A9AA0]">
                Количество ваших побед
              </h1>
              <p className="mt-3 text-center text-5xl font-bold tabular-nums text-white sm:text-6xl">
                {wins} <span aria-hidden>🔥</span>
              </p>
              <XpLevelBlock xp={xp} variant="stats" />
              <div className="mt-7 border-t border-white/10 pt-5">
                <p className="text-flow text-center text-sm font-normal leading-[1.45] text-[#9A9AA0]">
                  Всего опыта
                </p>
                <p className="mt-2 text-center text-2xl font-semibold text-white">
                  {xp} xp
                </p>
              </div>
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
          <div className="flex min-h-[10rem] flex-col items-center justify-center rounded-3xl border border-white/5 bg-[#151517] px-6 py-8 shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
            <StreakClock onDaysChange={setDaysCount} />
          </div>

          <div className="mt-5 rounded-3xl border border-white/5 bg-[#151517] p-5 shadow-[0_16px_36px_rgba(0,0,0,0.3)]">
            <p className="text-flow text-base font-medium leading-[1.45] text-white">
              Перепрошивка привычки
            </p>
            <p className="text-flow mt-1 text-sm leading-[1.45] text-[#9A9AA0]">
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
              onClick={() => setShowResetModal(true)}
              className="ml-auto text-sm text-[#9A9AA0] underline underline-offset-4 transition-colors duration-200 ease-out hover:text-white"
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
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#151517] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <div
              id="reset-modal-title"
              className="text-center text-base text-white"
            >
              <p className="text-flow mb-0 leading-[1.45]">
                Ты точно хочешь сбросить свой прогресс?
              </p>
              <p className="text-flow mb-0 mt-2 leading-[1.45]">
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

      {showInstallPrompt ? (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-prompt-title"
        >
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#151517] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <h2
              id="install-prompt-title"
              className="text-center text-xl font-semibold text-white"
            >
              Установи приложение
            </h2>
            <p className="mt-3 text-center text-sm leading-[1.45] text-[#9A9AA0]">
              Открывается быстрее
              <br />
              Не нужно каждый раз заходить через браузер
              <br />
              Проще удерживать контроль в нужный момент
            </p>
            <button
              type="button"
              onClick={handleInstallClick}
              className="mt-6 min-h-12 w-full rounded-2xl border border-amber-300/20 bg-[#1C1C1F] px-5 py-3 text-base font-semibold text-white transition duration-200 ease-out hover:brightness-110"
            >
              Установить
            </button>
            <button
              type="button"
              onClick={handleInstallDismiss}
              className="mt-3 block w-full text-center text-sm text-[#9A9AA0] transition duration-200 ease-out hover:text-white"
            >
              Позже
            </button>
          </div>
        </div>
      ) : null}

      <InstallFlowModal
        open={showInstallFlow}
        onClose={() => setShowInstallFlow(false)}
        onFinish={() => setShowInstallFlow(false)}
        onPlatformSelect={(platform) =>
          captureEvent('install_platform_selected', { platform })
        }
      />
    </>
  );
}
