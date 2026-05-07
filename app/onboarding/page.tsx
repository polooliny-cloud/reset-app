'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ONBOARDING_COMPLETED_KEY } from '@/lib/onboarding';
import { captureEvent } from '@/lib/posthogCapture';

type Stage =
  | 'welcome'
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

  const screenNumber =
    stage === 'welcome'
      ? 1
      : stage === 'question'
        ? 2 + questionIndex
        : stage === 'symptoms'
          ? 8
          : stage === 'harm'
            ? 9 + harmIndex
            : stage === 'features'
              ? 14 + featuresIndex
              : stage === 'goals'
                ? 20
                : stage === 'install'
                  ? 21
                  : 22;

  useEffect(() => {
    if (stage !== 'welcome') return;
    const key = `welcome:${screenNumber}`;
    if (viewedScreenEvents.has(key)) return;
    viewedScreenEvents.add(key);
    captureEvent('welcome_screen_viewed', { screen_number: screenNumber });
  }, [screenNumber, stage]);

  useEffect(() => {
    if (stage !== 'harm') return;
    const key = `harm:${harmIndex}`;
    if (viewedScreenEvents.has(key)) return;
    viewedScreenEvents.add(key);
    captureEvent('harm_slide_viewed', {
      screen_number: screenNumber,
      slide_number: harmIndex + 1,
    });
  }, [harmIndex, screenNumber, stage]);

  useEffect(() => {
    if (stage !== 'features') return;
    const key = `features:${featuresIndex}`;
    if (viewedScreenEvents.has(key)) return;
    viewedScreenEvents.add(key);
    captureEvent('features_slide_viewed', {
      screen_number: screenNumber,
      slide_number: featuresIndex + 1,
    });
  }, [featuresIndex, screenNumber, stage]);

  useEffect(() => {
    if (stage !== 'install') return;
    const key = `install:${screenNumber}`;
    if (viewedScreenEvents.has(key)) return;
    viewedScreenEvents.add(key);
    captureEvent('install_screen_viewed', { screen_number: screenNumber });
  }, [screenNumber, stage]);

  useEffect(() => {
    if (stage !== 'installInstruction' || !platform) return;
    const key = `instruction:${platform}`;
    if (viewedScreenEvents.has(key)) return;
    viewedScreenEvents.add(key);
    captureEvent('install_instruction_viewed', {
      screen_number: screenNumber,
      platform,
    });
  }, [platform, screenNumber, stage]);

  function completeOnboarding() {
    let alreadySent = onboardingCompleteSent.current;
    if (typeof window !== 'undefined') {
      try {
        alreadySent =
          alreadySent || localStorage.getItem(ONBOARDING_EVENT_DONE_KEY) === 'true';
        localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
        localStorage.setItem(ONBOARDING_EVENT_DONE_KEY, 'true');
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
      screen_number: screenNumber,
      platform,
    });
  }

  function toggleSymptom(item: string) {
    setSelectedSymptoms((prev) => {
      if (prev.includes(item)) return prev.filter((v) => v !== item);
      return [...prev, item];
    });
  }

  function toggleGoal(goal: string) {
    setSelectedGoals((prev) => {
      if (prev.includes(goal)) return prev.filter((v) => v !== goal);
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
    captureEvent('question_answered', {
      screen_number: screenNumber,
      question_number: questionIndex + 1,
      answer,
    });
    if (isLastQuestion) {
      setStage('symptoms');
      return;
    }
    openNextQuestion();
  }

  function handleSkipQuestion() {
    captureEvent('question_skipped', {
      screen_number: screenNumber,
      question_number: questionIndex + 1,
    });
    if (questionIndex === questions.length - 1) {
      setStage('symptoms');
      return;
    }
    setQuestionIndex((prev) => prev + 1);
  }

  function handleSymptomsNext() {
    captureEvent('symptoms_selected', {
      screen_number: screenNumber,
      selected_count: selectedSymptoms.length,
    });
    captureEvent('brain_reset_started', {
      screen_number: screenNumber,
      selected_count: selectedSymptoms.length,
    });
    setStage('harm');
  }

  function handleGoalsNext() {
    captureEvent('goals_selected', {
      screen_number: screenNumber,
      selected_count: selectedGoals.length,
    });
    setStage('install');
  }

  function handlePlatformSelect(nextPlatform: Platform) {
    setPlatform(nextPlatform);
    captureEvent('platform_selected', {
      screen_number: screenNumber,
      platform: nextPlatform,
    });
    setStage('installInstruction');
  }

  function handleOpenApp() {
    completeOnboarding();
    router.replace('/');
  }

  function handleBack() {
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
        ? 'radial-gradient(circle at 50% 24%, rgba(220, 38, 38, 0.3), rgba(59, 7, 10, 0.88) 68%, rgba(11, 11, 12, 1) 100%)'
        : 'radial-gradient(circle at 50% 24%, rgba(59, 130, 246, 0.24), rgba(15, 23, 42, 0.86) 68%, rgba(11, 11, 12, 1) 100%)'
      : 'radial-gradient(circle at 50% 24%, rgba(255, 140, 0, 0.08), transparent 62%)';

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
                      ? 'border-amber-300/35 bg-[#232327] text-white'
                      : 'border-white/10 bg-[#1C1C1F] text-[#E5E5E8] hover:bg-[#25252A]'
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
                  : 'cursor-not-allowed border-white/10 bg-[#1C1C1F]/70 text-white/45 hover:brightness-100'
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
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col pt-[calc(60px+env(safe-area-inset-top))] pb-[calc(12px+env(safe-area-inset-bottom))]">
          <div className="animate-onboarding-step flex flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 shadow-[0_22px_48px_rgba(0,0,0,0.42)]">
            <div className="flex min-h-[44%] flex-col items-center justify-center px-6 pb-4 pt-10">
              <p className="text-sm uppercase tracking-[0.18em] text-white/75">Reset</p>
              <p className="mt-7 text-6xl sm:text-7xl">{slide.emoji}</p>
            </div>
            <div className="flex flex-1 flex-col justify-between rounded-t-[2rem] bg-[#121214]/80 px-6 pb-6 pt-7 backdrop-blur-sm">
              <div>
                <h2 className="text-title text-measure text-center text-2xl font-semibold text-white">
                  {slide.title}
                </h2>
                <div className="mt-4 space-y-2">
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
                <Dots count={total} active={active} />
                <button
                  type="button"
                  onClick={onNext}
                  className="primary-cta mt-5"
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
              <button type="button" onClick={() => setStage('question')} className="primary-cta">
                Начать тест
              </button>
            </div>
          </div>
        ) : null}

        {stage === 'question' ? renderQuestionScreen() : null}

        {stage === 'symptoms' ? (
          <>
            <BackButton onClick={handleBack} />
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col pt-[calc(70px+env(safe-area-inset-top))]">
              <div className="animate-onboarding-step flex min-h-0 flex-1 flex-col">
                <h1 className="text-center text-2xl font-semibold text-white">Симптомы</h1>
                <div className="mt-4 rounded-2xl border border-red-400/20 bg-[#2A1115] px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.24)]">
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
                                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition duration-200 ease-out ${
                                  checked
                                    ? 'border-amber-300/35 bg-[#1C1C1F] text-white'
                                    : 'border-white/10 bg-[#151517] text-[#D4D4D8] hover:bg-[#1A1A1D]'
                                }`}
                              >
                                <span
                                  className={`h-4 w-4 rounded border transition ${
                                    checked
                                      ? 'border-amber-300/50 bg-amber-300/20'
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
                        className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition duration-200 ease-out ${
                          checked
                            ? 'border-amber-300/35 bg-[#1C1C1F] text-white'
                            : 'border-white/10 bg-[#151517] text-[#D4D4D8] hover:bg-[#1A1A1D]'
                        }`}
                      >
                        <span
                          className={`h-4 w-4 rounded border transition ${
                            checked ? 'border-amber-300/50 bg-amber-300/20' : 'border-white/30'
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
                  className="min-h-14 w-full rounded-2xl border border-white/10 bg-[#1C1C1F] px-5 py-4 text-base font-semibold text-white transition duration-200 ease-out hover:bg-[#232327]"
                >
                  Android
                </button>
                <button
                  type="button"
                  onClick={() => handlePlatformSelect('ios')}
                  className="min-h-14 w-full rounded-2xl border border-white/10 bg-[#1C1C1F] px-5 py-4 text-base font-semibold text-white transition duration-200 ease-out hover:bg-[#232327]"
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
              <ol className="text-body mt-7 space-y-4 rounded-3xl border border-white/5 bg-[#151517] p-5 text-sm text-[#D4D4D8]">
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
