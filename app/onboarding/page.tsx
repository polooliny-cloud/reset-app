'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { ONBOARDING_COMPLETED_KEY } from '@/lib/onboarding';
import { useAuth } from '@/lib/auth/useAuth';
import { captureEvent } from '@/lib/posthogCapture';

import {
  OnboardingOtpPanel,
  clearOnboardingResumeAfterMagicLink,
  peekOnboardingResumeAfterMagicLink,
} from './OnboardingOtpPanel';

type Stage =
  | 'welcome'
  | 'authRegister'
  | 'authLogin'
  | 'question'
  | 'symptoms'
  | 'harm'
  | 'features'
  | 'goals'
  | 'install'
  | 'installInstruction';

type Platform = 'ios' | 'android';

const ONBOARDING_EVENT_DONE_KEY = 'onboarding_done';
const viewedScreenEvents = new Set<string>();

const questions = [
  {
    title: 'Как часто вы обычно смотрите порнографию?',
    options: [
      'Больше раза в день',
      'Раз в день',
      'Несколько раз в неделю',
      'Реже раза в неделю',
    ],
  },
  {
    title: 'В каком возрасте вы впервые столкнулись с откровенным материалом?',
    options: ['12 или младше', '13-16', '17-24', '24 или старше'],
  },
  {
    title:
      'Используете ли вы порнографию как способ справиться с эмоциональным дискомфортом или болью?',
    options: ['Часто', 'Иногда', 'Редко или никогда'],
  },
  {
    title: 'Обращаетесь ли вы к порнографии, когда чувствуете стресс?',
    options: ['Часто', 'Иногда', 'Редко или никогда'],
  },
  {
    title: 'Смотрите ли вы порнографию от скуки?',
    options: ['Часто', 'Иногда', 'Редко или никогда'],
  },
  {
    title: 'Тратили ли вы деньги на доступ к откровенному контенту?',
    options: ['Да', 'Нет'],
  },
] as const;

const symptomGroups = [
  {
    title: 'Ментальные',
    items: [
      'Чувство немотивированности',
      'Отсутствие амбиций для достижения целей',
      'Трудности с концентрацией',
      'Плохая память или туман в голове',
      'Общая тревожность',
    ],
  },
  {
    title: 'Физические',
    items: [
      'Усталость и вялость',
      'Низкое либидо или половое влечение',
      'Слабая эрекция без порно',
    ],
  },
  {
    title: 'Социальные',
    items: [
      'Низкая уверенность в себе',
      'Ощущение непривлекательности',
      'Неудачный или неприятный секс',
      'Сниженное желание общаться',
      'Чувство изоляции от других',
    ],
  },
  {
    title: 'Вера',
    items: ['Чувство отдаленности от Бога'],
  },
] as const;

const harmSlides = [
  {
    emoji: '🧠',
    title: 'Порно - это наркотик',
    text: [
      'Использование порно высвобождает химическое вещество в мозге,',
      'называемое дофамин.',
      'Это вещество заставляет вас чувствовать удовольствие,',
      'когда вы смотрите порно.',
    ],
  },
  {
    emoji: '💔',
    title: 'Порно разрушает отношения',
    text: [
      'Порно снижает ваш интерес к настоящим отношениям',
      'и заменяет его желанием смотреть еще больше порно.',
    ],
  },
  {
    emoji: '🫥',
    title: 'Порно убивает половое влечение',
    text: [
      'Более 50% зависимых от порно сообщили о потере интереса',
      'к реальному сексу и снижении полового влечения.',
    ],
  },
  {
    emoji: '😞',
    title: 'Чувствуете себя несчастным?',
    text: [
      'Постоянный дофамин перегружает мозг.',
      'Из-за этого многим становится сложно чувствовать мотивацию,',
      'радость и эмоциональную стабильность.',
    ],
  },
  {
    emoji: '🌱',
    title: 'Путь к восстановлению',
    text: [
      'Восстановление возможно.',
      'Воздерживаясь от порно, мозг постепенно восстанавливает',
      'чувствительность к дофамину.',
      'Это помогает улучшить отношения, самочувствие и контроль над собой.',
    ],
  },
] as const;

const featureSlides = [
  {
    emoji: '✨',
    title: 'Добро пожаловать в Reset',
    text: [
      'С более чем 1000 пользователей, Reset помогает людям',
      'вернуть контроль над собой.',
    ],
  },
  {
    emoji: '⚙️',
    title: 'Перезагрузите свой мозг',
    text: [
      'Научно обоснованные упражнения помогут восстановить',
      'дофаминовые рецепторы и избежать срывов.',
    ],
  },
  {
    emoji: '🧘',
    title: 'Оставайтесь мотивированным',
    text: [
      'Счетчик прогресса помогает сохранять мотивацию,',
      'пока вы становитесь лучшей версией себя.',
    ],
  },
  {
    emoji: '🔒',
    title: 'Избегайте срывов',
    text: [
      'Reset помогает замечать триггеры и привычки,',
      'которые запускают импульс.',
    ],
  },
  {
    emoji: '😌',
    title: 'Победи себя',
    text: [
      'Поймите свои сильные и слабые стороны.',
      'Развивайте самоконтроль и отслеживайте прогресс.',
    ],
  },
  {
    emoji: '🏆',
    title: 'Улучшите свою жизнь',
    text: ['Перезагрузка помогает стать сильнее, здоровее и счастливее.'],
  },
] as const;

const goals = [
  'Крепкие отношения',
  'Улучшенная уверенность в себе',
  'Улучшенное настроение и счастье',
  'Больше энергии и мотивации',
  'Улучшенное либидо и сексуальная жизнь',
  'Улучшенный самоконтроль',
  'Улучшенная концентрация и ясность',
  'Чистые и здоровые мысли',
] as const;

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Назад"
      className="fixed left-4 z-40 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2.5 text-white/80 backdrop-blur-md transition duration-200 ease-out hover:bg-white/10 hover:text-white sm:left-6"
      style={{ top: 'calc(16px + env(safe-area-inset-top))' }}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path
          d="M15 18L9 12L15 6"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function Dots({ count, active }: { count: number; active: number }) {
  return (
    <div className="mt-5 flex items-center justify-center gap-2">
      {Array.from({ length: count }).map((_, idx) => (
        <span
          key={idx}
          className={`h-1.5 rounded-full transition-all duration-250 ${
            idx === active ? 'w-5 bg-white' : 'w-2 bg-white/30'
          }`}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { session, initializing } = useAuth();
  const [stage, setStage] = useState<Stage>('welcome');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionAnswers, setQuestionAnswers] = useState<(string | null)[]>(
    () => Array.from({ length: questions.length }, () => null),
  );
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [harmIndex, setHarmIndex] = useState(0);
  const [featuresIndex, setFeaturesIndex] = useState(0);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const onboardingCompleteSent = useRef(false);
  const authResumeHandledRef = useRef(false);

  useEffect(() => {
    if (!session?.user) {
      authResumeHandledRef.current = false;
    }
  }, [session?.user]);

  /** Уже прошли онбординг раньше, но без аккаунта — сразу экран регистрации (как в онбординге). */
  useLayoutEffect(() => {
    if (initializing) return;
    if (session?.user) return;
    if (typeof window === 'undefined') return;
    try {
      const done = localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
      if (done) {
        setStage((prev) => (prev === 'welcome' ? 'authRegister' : prev));
      }
    } catch {
      // ignore
    }
  }, [initializing, session?.user]);

  useEffect(() => {
    if (!session?.user || peekOnboardingResumeAfterMagicLink() !== 'question') return;
    if (authResumeHandledRef.current) return;
    authResumeHandledRef.current = true;

    let completedOnboardingBeforeAuth = false;
    try {
      completedOnboardingBeforeAuth =
        localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
    } catch {
      // ignore
    }

    clearOnboardingResumeAfterMagicLink();
    captureEvent('auth_success');

    if (completedOnboardingBeforeAuth) {
      router.replace('/');
      return;
    }

    setStage('question');
    setQuestionIndex(0);
  }, [session?.user?.id, router]);

  useEffect(() => {
    if (stage === 'welcome' && !session?.user) {
      clearOnboardingResumeAfterMagicLink();
    }
  }, [stage, session?.user]);

  useEffect(() => {
    if (stage !== 'question') return;
    const question = questionIndex + 1;
    const key = `question:${question}`;
    if (viewedScreenEvents.has(key)) return;
    viewedScreenEvents.add(key);
    captureEvent('onboarding_question_viewed', { question });
  }, [questionIndex, stage]);

  useEffect(() => {
    if (stage !== 'symptoms') return;
    const key = 'symptoms_screen';
    if (viewedScreenEvents.has(key)) return;
    viewedScreenEvents.add(key);
    captureEvent('symptoms_screen_viewed');
  }, [stage]);

  useEffect(() => {
    if (stage !== 'harm') return;
    const slide = harmIndex + 1;
    const key = `damage:${slide}`;
    if (viewedScreenEvents.has(key)) return;
    viewedScreenEvents.add(key);
    captureEvent('damage_slide_viewed', { slide });
  }, [harmIndex, stage]);

  useEffect(() => {
    if (stage !== 'features') return;
    const slide = featuresIndex + 1;
    const key = `benefits:${slide}`;
    if (viewedScreenEvents.has(key)) return;
    viewedScreenEvents.add(key);
    captureEvent('benefits_slide_viewed', { slide });
  }, [featuresIndex, stage]);

  useEffect(() => {
    if (stage !== 'goals') return;
    const key = 'goals_screen';
    if (viewedScreenEvents.has(key)) return;
    viewedScreenEvents.add(key);
    captureEvent('goals_screen_viewed');
  }, [stage]);

  useEffect(() => {
    if (stage !== 'install') return;
    const key = 'install_screen';
    if (viewedScreenEvents.has(key)) return;
    viewedScreenEvents.add(key);
    captureEvent('install_screen_viewed');
  }, [stage]);

  useEffect(() => {
    if (stage !== 'installInstruction' || !platform) return;
    const key = `instruction:${platform}`;
    if (viewedScreenEvents.has(key)) return;
    viewedScreenEvents.add(key);
    captureEvent('install_instruction_viewed', { platform });
  }, [platform, stage]);

  function completeOnboarding() {
    let alreadySent = onboardingCompleteSent.current;
    if (typeof window !== 'undefined') {
      try {
        alreadySent =
          alreadySent || localStorage.getItem(ONBOARDING_EVENT_DONE_KEY) === 'true';
        localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
        localStorage.setItem(ONBOARDING_EVENT_DONE_KEY, 'true');
        clearOnboardingResumeAfterMagicLink();
      } catch {
        // ignore
      }
    }
    if (alreadySent) {
      onboardingCompleteSent.current = true;
      return;
    }
    onboardingCompleteSent.current = true;
    try {
      localStorage.setItem(ONBOARDING_EVENT_DONE_KEY, 'true');
    } catch {
      // ignore
    }
    captureEvent('onboarding_completed', {
      platform,
    });
  }

  function toggleSymptom(item: string) {
    setSelectedSymptoms((prev) => {
      if (prev.includes(item)) return prev.filter((v) => v !== item);
      captureEvent('symptom_selected', { symptom: item });
      return [...prev, item];
    });
  }

  function toggleGoal(goal: string) {
    setSelectedGoals((prev) => {
      if (prev.includes(goal)) return prev.filter((v) => v !== goal);
      captureEvent('goal_selected', { goal });
      return [...prev, goal];
    });
  }

  function openNextQuestion() {
    if (questionIndex === questions.length - 1) {
      return;
    }
    setQuestionIndex((prev) => prev + 1);
  }

  function handleQuestionAnswer(answer: string) {
    setQuestionAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = answer;
      return next;
    });
  }

  function handleQuestionNext() {
    const answer = questionAnswers[questionIndex];
    if (!answer) return;
    captureEvent('onboarding_question_answered', {
      question: questionIndex + 1,
      answer,
    });
    if (isLastQuestion) {
      setStage('symptoms');
      return;
    }
    openNextQuestion();
  }

  function handleSkipQuestion() {
    captureEvent('onboarding_question_skipped', { question: questionIndex + 1 });
    if (questionIndex === questions.length - 1) {
      setStage('symptoms');
      return;
    }
    setQuestionIndex((prev) => prev + 1);
  }

  function handleSymptomsNext() {
    captureEvent('symptoms_completed', { selected_count: selectedSymptoms.length });
    setStage('harm');
  }

  function handleGoalsNext() {
    captureEvent('goals_completed', { selected_count: selectedGoals.length });
    setStage('install');
  }

  function handlePlatformSelect(nextPlatform: Platform) {
    setPlatform(nextPlatform);
    captureEvent('install_platform_selected', { platform: nextPlatform });
    setStage('installInstruction');
  }

  function handleOpenApp() {
    if (onboardingCompleteSent.current) return;
    captureEvent('install_flow_completed', { platform });
    completeOnboarding();
    router.replace('/');
  }

  function handleBack() {
    if (stage === 'authRegister' || stage === 'authLogin') {
      setStage('welcome');
      return;
    }
    if (stage === 'question') {
      if (questionIndex === 0) {
        setStage('welcome');
        return;
      }
      setQuestionIndex((prev) => prev - 1);
      return;
    }
    if (stage === 'symptoms') {
      setStage('question');
      setQuestionIndex(questions.length - 1);
      return;
    }
    if (stage === 'harm') {
      if (harmIndex === 0) {
        setStage('symptoms');
        return;
      }
      setHarmIndex((prev) => prev - 1);
      return;
    }
    if (stage === 'features') {
      if (featuresIndex === 0) {
        setStage('harm');
        setHarmIndex(harmSlides.length - 1);
        return;
      }
      setFeaturesIndex((prev) => prev - 1);
      return;
    }
    if (stage === 'goals') {
      setStage('features');
      setFeaturesIndex(featureSlides.length - 1);
      return;
    }
    if (stage === 'install') {
      setStage('goals');
      return;
    }
    if (stage === 'installInstruction') {
      setStage('install');
      return;
    }
  }

  const question = questions[questionIndex];
  const isLastQuestion = questionIndex === questions.length - 1;
  const selectedAnswer = questionAnswers[questionIndex];

  const carouselTheme =
    stage === 'harm'
      ? harmIndex < harmSlides.length - 1
        ? 'radial-gradient(circle at 52% 22%, rgba(248, 113, 113, 0.24), rgba(69, 10, 10, 0.84) 66%, rgba(9, 12, 20, 1) 100%)'
        : 'radial-gradient(circle at 50% 22%, rgba(167, 139, 250, 0.2), rgba(30, 41, 59, 0.86) 66%, rgba(9, 12, 20, 1) 100%)'
      : 'radial-gradient(circle at 50% 20%, rgba(167, 139, 250, 0.12), rgba(9, 12, 20, 0) 60%)';

  function renderQuestionScreen() {
    return (
      <>
        <BackButton onClick={handleBack} />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col pt-[calc(72px+env(safe-area-inset-top))]">
          <div className="surface-card animate-onboarding-step px-5 py-7">
            <p className="text-center text-xl font-semibold text-white">
              Вопрос {questionIndex + 1}
            </p>
            <p className="text-measure text-body mt-3 text-center text-[15px] text-[#B5B5BA]">
              {question.title}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              {question.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleQuestionAnswer(option)}
                  className={`min-h-12 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition duration-200 ease-out ${
                    selectedAnswer === option
                      ? 'selection-card selection-card-active text-white'
                      : 'selection-card text-[#E2E8F0]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-auto pb-[calc(16px+env(safe-area-inset-bottom))] pt-5">
            <button
              type="button"
              onClick={handleQuestionNext}
              disabled={!selectedAnswer}
              className={`primary-cta ${
                selectedAnswer
                  ? ''
                  : 'cursor-not-allowed border-slate-400/20 bg-slate-900/60 text-white/45 hover:brightness-100'
              }`}
            >
              {isLastQuestion ? 'Завершить тест' : 'Далее'}
            </button>
            {!isLastQuestion ? (
              <button
                type="button"
                onClick={handleSkipQuestion}
                className="secondary-link mt-3"
              >
                Пропустить
              </button>
            ) : null}
          </div>
        </div>
      </>
    );
  }

  function renderCarouselScreen(
    slide: { emoji: string; title: string; text: readonly string[] },
    total: number,
    active: number,
    onNext: () => void,
  ) {
    return (
      <>
        <BackButton onClick={handleBack} />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col pt-[calc(52px+env(safe-area-inset-top))] pb-[calc(10px+env(safe-area-inset-bottom))]">
          <div className="animate-onboarding-step flex flex-1 flex-col overflow-hidden rounded-[2rem] border border-slate-300/15 bg-slate-950/40 shadow-[0_24px_54px_rgba(3,7,18,0.58)] backdrop-blur-sm">
            <div className="flex min-h-[40%] flex-col items-center justify-center px-6 pb-3 pt-8">
              <p className="text-sm uppercase tracking-[0.18em] text-white/75">Reset</p>
              <p className="mt-5 text-6xl sm:text-7xl">{slide.emoji}</p>
            </div>
            <div className="flex flex-1 flex-col justify-between rounded-t-[2rem] bg-slate-950/55 px-6 pb-4 pt-5 backdrop-blur-md">
              <div>
                <h2 className="text-title text-measure text-center text-2xl font-semibold text-white">
                  {slide.title}
                </h2>
                <div className="mt-3 space-y-1.5">
                  {slide.text.map((line) => (
                    <p
                      key={line}
                      className="text-body text-measure text-center text-[15px] text-[#C4C4C9]"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
              <div>
                <div className="pt-1">
                  <Dots count={total} active={active} />
                </div>
                <button
                  type="button"
                  onClick={onNext}
                  className="primary-cta mt-4"
                >
                  Далее
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[#0B0B0C] px-4 py-5 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: carouselTheme,
        }}
      />
      <div className="relative z-10 flex min-h-0 flex-1">
        {stage === 'welcome' ? (
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-2 pb-[calc(16px+env(safe-area-inset-bottom))] pt-[calc(20px+env(safe-area-inset-top))]">
            <p className="text-sm uppercase tracking-[0.22em] text-white/80">Reset</p>
            <h1 className="text-title mt-10 text-center text-[2.1rem] font-semibold text-white">
              Добро пожаловать!
            </h1>
            <p className="text-body text-measure mt-4 text-center text-[15px] text-[#9A9AA0]">
              Давайте начнем с того, чтобы узнать, есть ли у вас проблемы с порно
            </p>
            <div className="mt-auto w-full pt-8">
              <button
                type="button"
                onClick={() => {
                  if (session?.user) {
                    clearOnboardingResumeAfterMagicLink();
                    setStage('question');
                    setQuestionIndex(0);
                    return;
                  }
                  captureEvent('auth_screen_viewed', { mode: 'register' });
                  setStage('authRegister');
                }}
                className="primary-cta"
              >
                Начать тест
              </button>
            </div>
          </div>
        ) : null}

        {stage === 'authRegister' ? (
          <OnboardingOtpPanel
            mode="register"
            onSwitchToLogin={() => {
              captureEvent('auth_screen_viewed', { mode: 'login' });
              setStage('authLogin');
            }}
            onSwitchToRegister={() => setStage('authRegister')}
            onBack={() => setStage('welcome')}
          />
        ) : null}

        {stage === 'authLogin' ? (
          <OnboardingOtpPanel
            mode="login"
            onSwitchToLogin={() => setStage('authLogin')}
            onSwitchToRegister={() => {
              captureEvent('auth_screen_viewed', { mode: 'register' });
              setStage('authRegister');
            }}
            onBack={() => setStage('welcome')}
          />
        ) : null}

        {stage === 'question' ? renderQuestionScreen() : null}

        {stage === 'symptoms' ? (
          <>
            <BackButton onClick={handleBack} />
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col pt-[calc(70px+env(safe-area-inset-top))]">
              <div className="animate-onboarding-step flex min-h-0 flex-1 flex-col">
                <h1 className="text-center text-2xl font-semibold text-white">Симптомы</h1>
                <div className="glass-danger mt-4 px-4 py-3">
                  <p className="text-body text-measure text-center text-sm text-[#FFB6BD]">
                    Чрезмерное использование порно может иметь негативные психологические
                    последствия.
                  </p>
                </div>
                <p className="mt-5 text-center text-base font-medium text-white">
                  Выберите любые симптомы ниже
                </p>
                <div className="mt-4 min-h-0 flex-1 overflow-y-auto pb-[calc(106px+env(safe-area-inset-bottom))] pr-1">
                  <div className="space-y-5">
                    {symptomGroups.map((group) => (
                      <section key={group.title}>
                        <p className="mb-2 text-xs uppercase tracking-[0.12em] text-[#8C8C92]">
                          {group.title}
                        </p>
                        <div className="space-y-2">
                          {group.items.map((item) => {
                            const checked = selectedSymptoms.includes(item);
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => toggleSymptom(item)}
                                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition duration-200 ease-out ${
                                  checked
                                    ? 'selection-card selection-card-active text-white'
                                    : 'selection-card text-[#D4DDEB]'
                                }`}
                              >
                                <span
                                  className={`h-4 w-4 rounded border transition ${
                                    checked
                                      ? 'border-violet-300/70 bg-violet-300/25'
                                      : 'border-white/30'
                                  }`}
                                />
                                <span className="text-body">{item}</span>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              </div>
              <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
                <button type="button" onClick={handleSymptomsNext} className="primary-cta">
                  Перезагрузить мозг
                </button>
              </div>
            </div>
          </>
        ) : null}

        {stage === 'harm'
          ? renderCarouselScreen(harmSlides[harmIndex], harmSlides.length, harmIndex, () => {
              if (harmIndex < harmSlides.length - 1) {
                setHarmIndex((prev) => prev + 1);
                return;
              }
              captureEvent('damage_block_completed');
              setStage('features');
            })
          : null}

        {stage === 'features'
          ? renderCarouselScreen(
              featureSlides[featuresIndex],
              featureSlides.length,
              featuresIndex,
              () => {
                if (featuresIndex < featureSlides.length - 1) {
                  setFeaturesIndex((prev) => prev + 1);
                  return;
                }
                captureEvent('benefits_block_completed');
                setStage('goals');
              },
            )
          : null}

        {stage === 'goals' ? (
          <>
            <BackButton onClick={handleBack} />
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col pt-[calc(70px+env(safe-area-inset-top))]">
              <h1 className="text-center text-2xl font-semibold text-white">Выбери свои цели</h1>
              <p className="text-body text-measure mx-auto mt-3 text-center text-sm text-[#9A9AA0]">
                Выбери цели, которых хочешь достичь во время перезагрузки
              </p>
              <div className="mt-5 min-h-0 flex-1 overflow-y-auto pb-[calc(106px+env(safe-area-inset-bottom))] pr-1">
                <div className="space-y-2">
                  {goals.map((goal) => {
                    const checked = selectedGoals.includes(goal);
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => toggleGoal(goal)}
                        className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition duration-200 ease-out ${
                          checked
                            ? 'selection-card selection-card-active text-white'
                            : 'selection-card text-[#D4DDEB]'
                        }`}
                      >
                        <span
                          className={`h-4 w-4 rounded border transition ${
                            checked ? 'border-violet-300/70 bg-violet-300/25' : 'border-white/30'
                          }`}
                        />
                        <span className="text-body">{goal}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
                <button type="button" onClick={handleGoalsNext} className="primary-cta">
                  Далее
                </button>
              </div>
            </div>
          </>
        ) : null}

        {stage === 'install' ? (
          <>
            <BackButton onClick={handleBack} />
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col pt-[calc(70px+env(safe-area-inset-top))] pb-[calc(16px+env(safe-area-inset-bottom))]">
              <h1 className="text-title text-measure mx-auto text-center text-2xl font-semibold text-white">
                Скачай приложение, чтобы оно всегда было рядом
              </h1>
              <div className="mt-8 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => handlePlatformSelect('android')}
                  className="selection-card min-h-14 w-full px-5 py-4 text-base font-semibold text-white"
                >
                  Android
                </button>
                <button
                  type="button"
                  onClick={() => handlePlatformSelect('ios')}
                  className="selection-card min-h-14 w-full px-5 py-4 text-base font-semibold text-white"
                >
                  iPhone
                </button>
              </div>
            </div>
          </>
        ) : null}

        {stage === 'installInstruction' && platform ? (
          <>
            <BackButton onClick={handleBack} />
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col pt-[calc(70px+env(safe-area-inset-top))] pb-[calc(16px+env(safe-area-inset-bottom))]">
              <h1 className="text-center text-2xl font-semibold text-white">Следуй инструкции</h1>
              <p className="text-body text-measure mt-2 text-center text-sm text-[#9A9AA0]">
                Это займет 10 секунд
              </p>
              <ol className="text-body mt-7 space-y-4 rounded-3xl border border-slate-300/20 bg-slate-900/60 p-5 text-sm text-[#D4D4D8] backdrop-blur-md">
                {platform === 'android' ? (
                  <>
                    <li>1. Нажми на три точки в правом верхнем углу браузера</li>
                    <li>2. Выбери: Добавить на главный экран</li>
                    <li>3. Подтверди установку</li>
                  </>
                ) : (
                  <>
                    <li>1. Нажми кнопку Поделиться</li>
                    <li>2. Выбери: На экран Домой</li>
                    <li>3. Подтверди добавление</li>
                  </>
                )}
              </ol>
              <div className="mt-auto pt-6">
                <button type="button" onClick={handleOpenApp} className="primary-cta">
                  Открыть приложение
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
