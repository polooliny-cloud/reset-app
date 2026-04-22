'use client';

import { IBM_Plex_Sans } from 'next/font/google';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { trackOnce } from '@/lib/analytics';
import { posthogCapture } from '@/lib/posthogCapture';

const DURATION_SECONDS = 90;
const MESSAGE_INTERVAL_SECONDS = 15;
const WINS_KEY = 'wins';
const XP_KEY = 'xp';
const TIMER_MESSAGES = [
  'Снова это желание…\nСейчас мозг ждёт привычное вознаграждение.',
  'Раньше ты бы просто сделал это…\nНо сейчас ты ломаешь этот сценарий.',
  'Сделай глубокий вдох,\nзадержи дыхание\nи медленно выдохни.',
  'Тело уже успокаивается.\nИ желание начинает отпускать.',
  'Прошла уже минута.\nЭто значит, что ты сам сделал свой выбор.',
  'Ты справился!!!\nЗапомни это состояние — через час ты почувствуешь гордость за себя.',
] as const;
const LAST_TIMER_MESSAGE_NOTE = 'Фух, хорошо, что я тогда не сдался';
const TRIGGERS = [
  'Скука',
  'Стресс',
  'Тревога',
  'Одиночество',
  'Усталость',
  'Прокрастинация (избегаю задачи)',
  'Привычка (автопилот)',
  'Желание удовольствия',
  'Раздражение',
  'Печаль',
  'Социальный триггер (контент, картинки)',
  'Перед сном',
] as const;

const plex = IBM_Plex_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600', '700'],
});

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}`;
}

function getTimerMessageIndex(timeLeft: number): number {
  const elapsedSeconds = DURATION_SECONDS - timeLeft;
  return Math.min(
    Math.floor(elapsedSeconds / MESSAGE_INTERVAL_SECONDS),
    TIMER_MESSAGES.length - 1,
  );
}

export default function SosPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<'trigger' | 'timer'>('trigger');
  const [timeLeft, setTimeLeft] = useState(DURATION_SECONDS);
  const [wins, setWins] = useState(0);
  const [xp, setXp] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const hasTrackedSosCompletedRef = useRef(false);
  const rewardGivenRef = useRef(false);
  const [statsHydrated, setStatsHydrated] = useState(false);
  const timerMessageIndex = getTimerMessageIndex(timeLeft);
  const timerMessage = TIMER_MESSAGES[timerMessageIndex];
  const isLastTimerMessage = timerMessageIndex === TIMER_MESSAGES.length - 1;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedWins = localStorage.getItem(WINS_KEY);
    const savedXp = localStorage.getItem(XP_KEY);
    if (savedWins !== null) {
      const n = Number(savedWins);
      if (Number.isFinite(n)) setWins(n);
    }
    if (savedXp !== null) {
      const n = Number(savedXp);
      if (Number.isFinite(n)) setXp(n);
    }
    setStatsHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !statsHydrated) return;
    localStorage.setItem(WINS_KEY, wins.toString());
  }, [wins, statsHydrated]);

  useEffect(() => {
    if (typeof window === 'undefined' || !statsHydrated) return;
    localStorage.setItem(XP_KEY, xp.toString());
  }, [xp, statsHydrated]);

  useEffect(() => {
    if (screen !== 'timer') return;
    if (timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [screen, timeLeft]);

  useEffect(() => {
    if (screen !== 'timer') return;
    if (timeLeft !== 0) return;
    if (hasTrackedSosCompletedRef.current) return;
    hasTrackedSosCompletedRef.current = true;
    trackOnce('sos_completed');
    posthogCapture('sos_completed');
  }, [screen, timeLeft]);

  useEffect(() => {
    if (screen !== 'timer') return;
    if (timeLeft !== 0) return;
    if (rewardGivenRef.current) return;
    rewardGivenRef.current = true;
    setShowReward(true);
  }, [screen, timeLeft]);

  function toggleTrigger(trigger: string) {
    setSelectedTriggers((prev) => {
      if (prev.includes(trigger)) {
        return prev.filter((item) => item !== trigger);
      }
      return [...prev, trigger];
    });
  }

  return (
    <main
      className={`${plex.className} flex min-h-screen flex-col bg-[#0B0B0C] px-4 pb-8 pt-4 text-white`}
    >
      <div className="w-full max-w-lg self-start px-1 pt-2">
        {screen === 'trigger' ? (
          <button
            type="button"
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-[#9A9AA0] transition-colors duration-200 ease-out hover:bg-[#1C1C1F] hover:text-white"
          >
            <span aria-hidden className="text-xl leading-none">
              ←
            </span>
            <span className="text-base font-medium">Назад</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-[#9A9AA0] transition-colors duration-200 ease-out hover:bg-[#1C1C1F] hover:text-white"
          >
            <span aria-hidden className="text-xl leading-none">
              ←
            </span>
            <span className="text-base font-medium">Назад</span>
          </button>
        )}
      </div>

      {screen === 'trigger' ? (
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-2 pb-28 pt-8">
          <h1 className="text-2xl font-semibold leading-snug text-white">
            Что сейчас происходит?
          </h1>
          <p className="mb-6 mt-2 text-sm text-[#9A9AA0]">
            Осознание ослабляет импульс
          </p>

          <div className="flex flex-1 flex-col gap-3">
            {TRIGGERS.map((trigger) => {
              const checked = selectedTriggers.includes(trigger);
              return (
                <label
                  key={trigger}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition duration-200 ease-out ${
                    checked
                      ? 'border-amber-300/40 bg-[#1C1C1F] text-white'
                      : 'border-white/10 bg-[#151517] text-[#D4D4D8] hover:bg-[#1A1A1D]'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-amber-400"
                    checked={checked}
                    onChange={() => toggleTrigger(trigger)}
                  />
                  <span>{trigger}</span>
                </label>
              );
            })}
          </div>

          {selectedTriggers.length > 0 ? (
            <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-lg px-4 pb-6 pt-3">
              <button
                type="button"
                onClick={() => {
                  setTimeLeft(DURATION_SECONDS);
                  setShowReward(false);
                  setScreen('timer');
                }}
                className="min-h-14 w-full rounded-3xl border border-amber-300/25 bg-[#1C1C1F] py-4 text-base font-semibold text-white shadow-[0_16px_36px_rgba(0,0,0,0.4)] transition duration-200 ease-out hover:brightness-110 active:scale-[0.99]"
              >
                Далее
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-7 px-4 py-10 text-center [background:radial-gradient(ellipse_at_center,rgba(245,158,11,0.10)_0%,rgba(11,11,12,0)_65%)]">
          <p className="text-6xl font-bold tabular-nums tracking-tight text-white sm:text-7xl">
            {formatTimer(timeLeft)}
          </p>
          <p
            key={`sos-message-${timerMessageIndex}`}
            className="min-h-[5.5rem] max-w-md whitespace-pre-line text-lg font-medium leading-relaxed text-[#D4D4D8] transition-opacity duration-300 motion-safe:animate-sos-phase-text sm:text-xl"
          >
            {timerMessage}
          </p>

          {isLastTimerMessage ? (
            <p className="mt-1 text-sm text-[#9A9AA0]">{LAST_TIMER_MESSAGE_NOTE}</p>
          ) : null}
        </div>
      )}

      {showReward ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sos-reward-title"
        >
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#151517] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <p
              id="sos-reward-title"
              className="text-center text-base font-medium leading-relaxed text-white"
            >
              Молодец. Ты стал ещё опытней в контроле над собой.
            </p>
            <button
              type="button"
              onClick={() => {
                const nextWins = wins + 1;
                const nextXp = xp + 16;
                setWins(nextWins);
                setXp(nextXp);
                if (typeof window !== 'undefined') {
                  localStorage.setItem(WINS_KEY, String(nextWins));
                  localStorage.setItem(XP_KEY, String(nextXp));
                }
                setShowReward(false);
                rewardGivenRef.current = false;
                router.replace('/');
              }}
              className="mt-8 w-full min-h-14 rounded-2xl bg-[#1C1C1F] py-4 text-base font-semibold text-white transition duration-200 ease-out hover:bg-[#242428]"
            >
              Собрать опыт
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
