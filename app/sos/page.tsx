'use client';

import { IBM_Plex_Sans } from 'next/font/google';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { LAST_TIMER_MESSAGE_NOTE, TIMER_TEXTS } from '@/lib/sos/timerTexts';
import { captureFirstVictoryIfNeeded } from '@/lib/posthogCapture';
import { useProfileProgress } from '@/lib/profile/useProfileProgress';

export { TIMER_TEXTS };

const DURATION_SECONDS = 90;
const MESSAGE_INTERVAL_SECONDS = 15;
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
const TRIGGER_TO_KEY = {
  Скука: 'boredom',
  Стресс: 'stress',
  Тревога: 'anxiety',
  Одиночество: 'loneliness',
  Усталость: 'fatigue',
  'Прокрастинация (избегаю задачи)': 'procrastination',
  'Привычка (автопилот)': 'habit',
  'Желание удовольствия': 'pleasure',
  Раздражение: 'irritation',
  Печаль: 'sadness',
  'Социальный триггер (контент, картинки)': 'social',
  'Перед сном': 'beforeSleep',
} as const satisfies Record<(typeof TRIGGERS)[number], keyof typeof TIMER_TEXTS>;

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
  return Math.min(Math.floor(elapsedSeconds / MESSAGE_INTERVAL_SECONDS), 5);
}

export default function SosPage() {
  const router = useRouter();
  const { victories, awardVictory } = useProfileProgress();
  const wins = victories;
  const [screen, setScreen] = useState<'trigger' | 'timer'>('trigger');
  const [timeLeft, setTimeLeft] = useState(DURATION_SECONDS);
  const [showReward, setShowReward] = useState(false);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const hasTrackedSosCompletedRef = useRef(false);
  const rewardGivenRef = useRef(false);
  const [activeTrigger, setActiveTrigger] = useState<(typeof TRIGGERS)[number] | null>(
    null,
  );
  const timerMessageIndex = getTimerMessageIndex(timeLeft);
  const activeTriggerKey = activeTrigger
    ? TRIGGER_TO_KEY[activeTrigger]
    : ('boredom' as const);
  const timerMessage = TIMER_TEXTS[activeTriggerKey][timerMessageIndex];
  const isLastTimerMessage = timerMessageIndex === TIMER_TEXTS[activeTriggerKey].length - 1;

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
    captureFirstVictoryIfNeeded();
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
      className={`${plex.className} app-shell flex min-h-screen flex-col px-4 pb-8 pt-4 text-white`}
    >
      <div className="relative z-10">
      <button
        type="button"
        onClick={() => router.push('/')}
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

      {screen === 'trigger' ? (
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-2 pb-28 pt-[calc(64px+env(safe-area-inset-top))]">
          <h1 className="text-flow-heading text-2xl font-semibold text-white">
            Выберите триггер
          </h1>
          <p className="text-flow mb-6 mt-2 text-sm text-[#9A9AA0]">
            Вы учитесь замечать то, из-за чего появляется желание
          </p>

          <div className="flex flex-1 flex-col gap-3">
            {TRIGGERS.map((trigger) => {
              const checked = selectedTriggers.includes(trigger);
              return (
                <label
                  key={trigger}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition duration-200 ease-out ${
                    checked
                      ? 'selection-card selection-card-active text-white'
                      : 'selection-card text-[#D4DDEB]'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-violet-400"
                    checked={checked}
                    onChange={() => toggleTrigger(trigger)}
                  />
                  <span className="text-wrap-mobile min-w-0 flex-1 text-left">
                    {trigger}
                  </span>
                </label>
              );
            })}
          </div>

          {selectedTriggers.length > 0 ? (
            <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-lg px-4 pb-6 pt-3">
              <button
                type="button"
                onClick={() => {
                  const firstSelected = selectedTriggers[0] as
                    | (typeof TRIGGERS)[number]
                    | undefined;
                  setActiveTrigger(firstSelected ?? 'Скука');
                  setTimeLeft(DURATION_SECONDS);
                  setShowReward(false);
                  setScreen('timer');
                }}
                className="primary-cta min-h-14 rounded-3xl py-4"
              >
                Далее
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="relative mx-auto w-full max-w-md min-h-screen shrink-0">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 aspect-square max-h-[min(80vh,20rem)] w-[min(100%,20rem)] -translate-x-1/2 -translate-y-1/2"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(120, 95, 180, 0.11) 0%, rgba(9, 13, 20, 0) 68%)',
            }}
          />
          <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-4 pt-10 text-center">
            <div className="flex w-full flex-col items-center gap-5">
              <p className="text-6xl font-bold tabular-nums tracking-tight text-white sm:text-7xl">
                {formatTimer(timeLeft)}
              </p>
              <div className="flex w-full max-w-md flex-col items-center gap-2">
                <p
                  key={`sos-message-${timerMessageIndex}`}
                  className="text-flow-heading min-h-[5.5rem] text-lg font-medium text-[#D4D4D8] transition-opacity duration-300 motion-safe:animate-sos-phase-text sm:text-xl"
                >
                  {timerMessage}
                </p>
                {isLastTimerMessage ? (
                  <p className="text-flow text-sm text-[#9A9AA0]">
                    {LAST_TIMER_MESSAGE_NOTE}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {showReward ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#070a12]/72 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sos-reward-title"
        >
          <div className="surface-card w-full max-w-sm p-6">
            <p
              id="sos-reward-title"
              className="text-flow text-center text-base font-medium text-white"
            >
              Молодец. Вы стали ещё опытнее в контроле над собой.
            </p>
            <button
              type="button"
              onClick={() => {
                void awardVictory('relapse_resisted', 16);
                setShowReward(false);
                rewardGivenRef.current = false;
                router.replace('/');
              }}
              className="primary-cta mt-8 min-h-14 py-4"
            >
              Собрать опыт
            </button>
          </div>
        </div>
      ) : null}
      </div>
    </main>
  );
}
