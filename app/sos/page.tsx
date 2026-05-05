'use client';

import { IBM_Plex_Sans } from 'next/font/google';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { captureEvent } from '@/lib/posthogCapture';

const DURATION_SECONDS = 90;
const MESSAGE_INTERVAL_SECONDS = 15;
const WINS_KEY = 'wins';
const XP_KEY = 'xp';
export const TIMER_TEXTS = {
  boredom: [
    'Сейчас тебе скучно. Мозг просит быстрый стимул.',
    'Обычно ты бы ушел в автопилот. Сейчас ты меняешь ход.',
    'Сделай медленный вдох. Плечи вниз. Спокойный выдох.',
    'Тело стало мягче. Внутри уже тише.',
    'Ты уже держишь паузу. Это реальный прогресс.',
    'Ты справился с волной. Это твой контроль.',
  ],
  stress: [
    'В теле много напряжения. Стресс толкает к привычному выходу.',
    'Раньше ты снимал это импульсом. Сейчас выбираешь себя.',
    'Вдох на четыре счета. Пауза. Медленный выдох.',
    'Пульс снижается. Напряжение отпускает хватку.',
    'Ты не сорвался в пике. Это сильный шаг.',
    'Ты удержал контроль. Спокойствие уже на твоей стороне.',
  ],
  anxiety: [
    'Сейчас тревожно. Мозг пытается срочно все заглушить.',
    'Импульс спешит. Ты не обязан идти за ним.',
    'Положи ладонь на грудь. Медленный вдох и длинный выдох.',
    'Дыхание ровнее. Тревога теряет остроту.',
    'Ты выдержал этот момент. Это уже опора.',
    'Ты прошел волну тревоги. Контроль стал крепче.',
  ],
  loneliness: [
    'Сейчас ощущается пустота. Хочется быстро заполнить ее.',
    'Привычный сценарий знаком. Но ты выбираешь бережный путь.',
    'Выпрями спину. Вдох глубже. Медленный выдох.',
    'Тело успокаивается. Внутри становится теплее.',
    'Ты не убежал от чувства. Это зрелый шаг.',
    'Ты остался с собой и выдержал. Это сила.',
  ],
  fatigue: [
    'Ты устал. Мозг ищет легкий допинг.',
    'В усталости легко сорваться. Сейчас ты ставишь паузу.',
    'Потяни шею и плечи. Вдох. Спокойный выдох.',
    'Напряжение снижается. Голова становится яснее.',
    'Ты не пошел за быстрым решением. Отличный прогресс.',
    'Ты сохранил ресурс. Это умный контроль.',
  ],
  procrastination: [
    'Перед задачей есть сопротивление. Хочется сбежать в стимул.',
    'Раньше это было избегание. Сейчас ты прерываешь круг.',
    'Поставь стопы на пол. Вдох. Медленный выдох.',
    'Тело успокаивается. Мысли становятся ровнее.',
    'Ты не ушел от дискомфорта. Это рост.',
    'Ты удержал фокус на себе. Дальше будет легче.',
  ],
  habit: [
    'Это знакомый автопилот. Рука тянется почти сама.',
    'Сценарий старый. Но сейчас ты нажал паузу.',
    'Остановись на месте. Вдох через нос. Длинный выдох.',
    'Автоматизм ослабевает. Ты снова за рулем.',
    'Ты разорвал цепочку. Это важная победа.',
    'Ты выбрал осознанность. Новый паттерн уже формируется.',
  ],
  pleasure: [
    'Сейчас тянет к быстрому удовольствию. Это нормальный импульс.',
    'Импульс обещает легкость. Но ты выбираешь долгий выигрыш.',
    'Мягкий вдох. Пауза. Тихий выдох.',
    'Тяга снижается. В теле больше устойчивости.',
    'Ты не купился на момент. Это настоящий контроль.',
    'Ты выбрал себя в длинную. Это сильное решение.',
  ],
  irritation: [
    'Внутри раздражение. Хочется резко снять это чувство.',
    'Старый путь быстрый. Твой путь сейчас точнее.',
    'Сожми и расслабь кулаки. Вдох. Длинный выдох.',
    'Жар спадает. Мысли становятся спокойнее.',
    'Ты не отдал управление эмоции. Это прогресс.',
    'Ты выдержал и сохранил контроль. Отличная работа.',
  ],
  sadness: [
    'Сейчас накрывает печаль. Хочется заглушить ее стимулом.',
    'Ты можешь не убегать от чувства. Ты уже делаешь это.',
    'Положи руку на живот. Медленный вдох и выдох.',
    'Тело смягчается. Печаль уже не такая острая.',
    'Ты прожил этот отрезок честно. Это ценная сила.',
    'Ты выдержал мягко и спокойно. Это твоя победа.',
  ],
  social: [
    'Лента и картинки разогрели импульс. Это внешний триггер.',
    'Раньше контент вел тебя. Сейчас ты ставишь границу.',
    'Отведи взгляд от экрана. Вдох. Медленный выдох.',
    'Сигнал слабеет. Голова становится чище.',
    'Ты не пошел за внешним стимулом. Это контроль.',
    'Ты удержал фокус на себе. Это зрелый выбор.',
  ],
  beforeSleep: [
    'Ты уже в расслабленном теле. Мысли уводят в знакомый сценарий.',
    'Перед сном автопилот особенно тихий. Сейчас ты его заметил.',
    'Сделай глубокий вдох лежа. Длинный мягкий выдох.',
    'Тело тяжелее и спокойнее. Воображение замедляется.',
    'Ты сохранил курс перед сном. Это важный шаг.',
    'Ты завершаешь день с контролем. Засыпать будет легче.',
  ],
} as const;
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
  const [screen, setScreen] = useState<'trigger' | 'timer'>('trigger');
  const [timeLeft, setTimeLeft] = useState(DURATION_SECONDS);
  const [wins, setWins] = useState(0);
  const [xp, setXp] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const hasTrackedSosCompletedRef = useRef(false);
  const rewardGivenRef = useRef(false);
  const [statsHydrated, setStatsHydrated] = useState(false);
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
    captureEvent('victory_completed', { source: 'timer' });
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
      className={`${plex.className} relative isolate flex min-h-screen flex-col overflow-hidden bg-[#0B0B0C] px-4 pb-8 pt-4 text-white`}
    >
      {screen === 'trigger' ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(circle at 50% 70%, rgba(255, 140, 0, 0.06), transparent 72%)',
          }}
        />
      ) : null}
      <div className="relative z-10">
      <button
        type="button"
        onClick={() => router.push('/')}
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

      {screen === 'trigger' ? (
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-2 pb-28 pt-[calc(64px+env(safe-area-inset-top))]">
          <h1 className="text-flow-heading text-2xl font-semibold leading-[1.4] text-white">
            Выбери триггер
          </h1>
          <p className="text-flow mb-6 mt-2 text-sm leading-[1.45] text-[#9A9AA0]">
            Ты учишься замечать то, из-за чего появляется желание
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
                  <span className="text-wrap-mobile min-w-0 flex-1 text-left leading-[1.45]">
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
                className="min-h-14 w-full rounded-3xl border border-amber-300/25 bg-[#1C1C1F] py-4 text-base font-semibold text-white shadow-[0_16px_36px_rgba(0,0,0,0.4)] transition duration-200 ease-out hover:brightness-110 active:scale-[0.99]"
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
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 w-[min(100%,22rem)] aspect-square max-h-[min(80vh,22rem)] -translate-x-1/2 -translate-y-1/2"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.1) 0%, rgba(11, 11, 12, 0) 65%)',
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
                  className="text-flow-heading min-h-[5.5rem] text-lg font-medium leading-[1.45] text-[#D4D4D8] transition-opacity duration-300 motion-safe:animate-sos-phase-text sm:text-xl"
                >
                  {timerMessage}
                </p>
                {isLastTimerMessage ? (
                  <p className="text-flow text-sm leading-[1.45] text-[#9A9AA0]">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sos-reward-title"
        >
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#151517] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <p
              id="sos-reward-title"
              className="text-flow text-center text-base font-medium leading-[1.45] text-white"
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
      </div>
    </main>
  );
}
