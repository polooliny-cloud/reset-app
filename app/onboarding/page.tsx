'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { trackOnce } from '@/lib/analytics';
import { ONBOARDING_COMPLETED_KEY } from '@/lib/onboarding';
import { posthogCapture } from '@/lib/posthogCapture';

const steps = [
  {
    step: 1,
    step_name: 'welcome',
    title: 'Привет!',
    subtitle:
      'Пытаешься воздерживаться от мастурбации,\nно постоянно срываешься?',
  },
  {
    step: 2,
    step_name: 'problem',
    title:
      'Здесь знают о твоей проблеме\nи знают, как её решить.',
    subtitle: '',
  },
  {
    step: 3,
    step_name: 'finish',
    title: 'Начинай сейчас.',
    subtitle:
      'Отслеживай свой прогресс в приложении,\nа в моменты, когда хочется сорваться,\nнажимай на «Тревожную кнопку» и отвлекай свой мозг.\n\nЭти инструменты ПОМОГУТ тебе.',
  },
];

/** Живёт между mount/unmount в Strict Mode — один раз за загрузку страницы. */
let onboardingStartPosted = false;
const postedOnboardingSteps = new Set<number>();

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const onboardingCompleteSent = useRef(false);

  useEffect(() => {
    if (onboardingStartPosted) return;
    onboardingStartPosted = true;
    trackOnce('onboarding_start');
    posthogCapture('onboarding_start');
  }, []);

  useEffect(() => {
    const current = steps[currentStep];
    if (!current) return;
    if (postedOnboardingSteps.has(current.step)) return;
    postedOnboardingSteps.add(current.step);
    posthogCapture(`onboarding_step_${current.step}`);
  }, [currentStep]);

  const isLast = currentStep === steps.length - 1;
  const step = steps[currentStep];

  function finish() {
    if (onboardingCompleteSent.current) return;
    onboardingCompleteSent.current = true;
    trackOnce('onboarding_complete');
    posthogCapture('onboarding_completed');
    try {
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    } catch {
      // ignore
    }
    router.replace('/');
  }

  return (
    <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[#0B0B0C] px-4 py-6 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(circle at 50% 35%, rgba(255, 140, 0, 0.08), transparent 62%)',
        }}
      />
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <div
          key={currentStep}
          className="animate-onboarding-step rounded-3xl border border-white/5 bg-[#151517] px-6 py-8 shadow-[0_20px_45px_rgba(0,0,0,0.35)] sm:px-7 sm:py-10"
        >
          <h1 className="whitespace-pre-line text-center text-2xl font-semibold leading-snug text-white sm:text-3xl">
            {step.title}
          </h1>
          {step.subtitle ? (
            <p className="mt-5 whitespace-pre-line text-center text-base text-[#9A9AA0]">
              {step.subtitle}
            </p>
          ) : null}
        </div>

        <div
          className={`flex gap-3 sm:min-h-14 ${currentStep > 0 ? 'flex-col sm:flex-row sm:justify-between' : 'flex-col sm:flex-row sm:justify-end'}`}
        >
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => s - 1)}
              aria-label="Назад"
              className="inline-flex min-h-12 w-12 items-center justify-center self-start rounded-full border border-white/10 bg-white/5 p-2.5 text-white/80 backdrop-blur-sm transition duration-200 ease-out hover:bg-white/10 hover:text-white sm:min-h-14 sm:w-14"
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
          ) : null}

          {!isLast ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => s + 1)}
              className="min-h-12 w-full rounded-2xl border border-amber-300/20 bg-[#1C1C1F] px-6 py-3 text-base font-semibold text-white shadow-[0_14px_30px_rgba(0,0,0,0.35)] transition duration-200 ease-out hover:brightness-110 active:scale-[0.99] sm:min-h-14 sm:w-auto sm:min-w-[10rem]"
            >
              Далее
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="min-h-12 w-full rounded-2xl border border-amber-300/20 bg-[#1C1C1F] px-6 py-3 text-base font-semibold text-white shadow-[0_14px_30px_rgba(0,0,0,0.35)] transition duration-200 ease-out hover:brightness-110 active:scale-[0.99] sm:min-h-14 sm:w-auto sm:min-w-[10rem]"
            >
              Начать
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
