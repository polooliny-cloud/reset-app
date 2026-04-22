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
    title:
      'Ты не один.\nС этим сталкиваются тысячи парней.',
    subtitle:
      'Это не “слабость”. Это привычка, которую можно сломать.',
  },
  {
    step: 2,
    step_name: 'problem',
    title:
      'Ты знаешь это чувство.\nКогда “ещё чуть-чуть” — и ты уже не контролируешь себя.',
    subtitle: 'Всё происходит быстро. Почти автоматически.',
  },
  {
    step: 3,
    step_name: 'solution',
    title: 'Проблема не в тебе.\nПроблема — в моменте импульса.',
    subtitle: 'Если переждать его — ты сохраняешь контроль.',
  },
  {
    step: 4,
    step_name: 'motivation',
    title: 'Всё, что нужно —\nпереждать 60–90 секунд.',
    subtitle: 'Этого достаточно, чтобы импульс начал спадать.',
  },
  {
    step: 5,
    step_name: 'finish',
    title: 'Нажми “Тревожную кнопку”\nкогда станет сложно',
    subtitle: 'Таймер поможет тебе не сорваться в этот момент.',
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
    posthogCapture('onboarding_step', {
      step: current.step,
      step_name: current.step_name,
    });
  }, [currentStep]);

  const isLast = currentStep === steps.length - 1;
  const step = steps[currentStep];

  function finish() {
    if (onboardingCompleteSent.current) return;
    onboardingCompleteSent.current = true;
    trackOnce('onboarding_complete');
    posthogCapture('onboarding_complete');
    try {
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    } catch {
      // ignore
    }
    router.replace('/');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-8">
      <div className="flex w-full max-w-md flex-1 flex-col justify-center gap-8">
        <div key={currentStep} className="animate-onboarding-step">
          <h1 className="whitespace-pre-line text-center text-2xl font-semibold leading-snug text-gray-900 sm:text-3xl">
            {step.title}
          </h1>
          {step.subtitle ? (
            <p className="mt-6 whitespace-pre-line text-center text-base text-gray-500 sm:text-base">
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
              className="min-h-12 w-full rounded-xl bg-gray-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-gray-800 sm:min-h-14 sm:w-auto sm:min-w-[10rem]"
            >
              Далее
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="min-h-12 w-full rounded-xl bg-gray-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-gray-800 sm:min-h-14 sm:w-auto sm:min-w-[10rem]"
            >
              Начать
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
