'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { trackOnce } from '@/lib/analytics';
import { posthogCapture, posthogCaptureOnce } from '@/lib/posthogCapture';
import { ONBOARDING_COMPLETED_KEY } from '@/lib/onboarding';

const steps = [
  {
    title:
      'Ты не один.\nС этим сталкиваются тысячи парней.',
    subtitle:
      'Это не “слабость”. Это привычка, которую можно сломать.',
  },
  {
    title:
      'Ты знаешь это чувство.\nКогда “ещё чуть-чуть” — и ты уже не контролируешь себя.',
    subtitle: 'Всё происходит быстро. Почти автоматически.',
  },
  {
    title: 'Проблема не в тебе.\nПроблема — в моменте импульса.',
    subtitle: 'Если переждать его — ты сохраняешь контроль.',
  },
  {
    title: 'Всё, что нужно —\nпереждать 60–90 секунд.',
    subtitle: 'Этого достаточно, чтобы импульс начал спадать.',
  },
  {
    title: 'Нажми “Тревожную кнопку”\nкогда станет сложно',
    subtitle: 'Таймер поможет тебе не сорваться в этот момент.',
  },
  {
    title: 'Не нужно быть идеальным.\nПросто выдержи этот момент.',
    subtitle: '',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    trackOnce('onboarding_start');
    posthogCaptureOnce('onboarding_start');
  }, []);

  const isLast = currentStep === steps.length - 1;
  const step = steps[currentStep];

  function finish() {
    trackOnce('onboarding_complete');
    posthogCapture('onboarding_complete');
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
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
              className="min-h-12 w-full rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-800 transition hover:bg-gray-50 sm:min-h-14 sm:w-auto"
            >
              Назад
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
