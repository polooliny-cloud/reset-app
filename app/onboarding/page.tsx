'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { usePremium } from '@/app/components/PremiumProvider';
import { useProfileState } from '@/app/components/ProfileProvider';
import {
  clearOnboardingPendingAuthSession,
} from '@/lib/onboarding';
import {
  clearOnboardingProgress,
  loadOnboardingProgress,
  resumeOnboardingStage,
  saveOnboardingProgress,
  type OnboardingProgress,
} from '@/lib/onboardingProgress';
import { useAuth } from '@/lib/auth/useAuth';
import { ensureProfileForUser } from '@/lib/profile/ensureProfile';
import { startFreeTrialClient } from '@/lib/premium/startFreeTrialClient';
import { markTrialActivationPending } from '@/lib/premium/trialActivationPending';
import { captureEvent } from '@/lib/posthogCapture';
import { SOS_PAGE_GLOW } from '@/lib/sos/visual';
import { supabase } from '@/lib/supabase';

import { OnboardingOtpPanel } from './OnboardingOtpPanel';
import { SosDemoStage } from './SosDemoStage';

type Stage =
  | 'authRegister'
  | 'authLogin'
  | 'goals'
  | 'sosDemo'
  | 'install'
  | 'installInstruction';

type Platform = 'ios' | 'android';

const ONBOARDING_EVENT_DONE_KEY = 'onboarding_done';
const viewedScreenEvents = new Set<string>();

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

export default function OnboardingPage() {
  const router = useRouter();
  const { session, initializing } = useAuth();
  const { applyPremiumState, refetch: refetchPremium } = usePremium();
  const { onboardingCompleted, markOnboardingCompleted, appReady } = useProfileState();
  const [stage, setStage] = useState<Stage>('authRegister');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [sosDemoCompleted, setSosDemoCompleted] = useState(false);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const onboardingCompleteSent = useRef(false);
  const authHandledRef = useRef(false);
  const [trialStarting, setTrialStarting] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);

  function persistProgress(next: Partial<OnboardingProgress>) {
    const userId = session?.user?.id;
    if (!userId) return;
    const current = loadOnboardingProgress(userId);
    saveOnboardingProgress({
      ...current,
      userId,
      selectedGoals,
      sosDemoCompleted,
      ...next,
    });
  }

  useEffect(() => {
    if (!session?.user) {
      authHandledRef.current = false;
    }
  }, [session?.user]);

  useLayoutEffect(() => {
    if (!appReady || initializing) return;
    if (!session?.user) {
      window.setTimeout(() => {
        setStage((prev) =>
          prev === 'authRegister' || prev === 'authLogin' ? prev : 'authRegister',
        );
      }, 0);
      return;
    }
    if (onboardingCompleted) return;
    if (authHandledRef.current) return;
    authHandledRef.current = true;

    const progress = loadOnboardingProgress(session.user.id);
    window.setTimeout(() => {
      setSelectedGoals(progress.selectedGoals);
      setSosDemoCompleted(progress.sosDemoCompleted);
      setStage(resumeOnboardingStage(progress));
    }, 0);
  }, [appReady, initializing, onboardingCompleted, session?.user]);

  useEffect(() => {
    if (!session?.user) return;
    if (authHandledRef.current) return;
    const onAuthStage = stage === 'authRegister' || stage === 'authLogin';
    if (!onAuthStage) return;

    authHandledRef.current = true;
    clearOnboardingPendingAuthSession();

    if (!onboardingCompleted) {
      const progress = loadOnboardingProgress(session.user.id);
      window.setTimeout(() => {
        setSelectedGoals(progress.selectedGoals);
        setSosDemoCompleted(progress.sosDemoCompleted);
        setStage(resumeOnboardingStage(progress));
      }, 0);
      return;
    }

    void refetchPremium().finally(() => {
      router.replace('/');
    });
  }, [session?.user, session?.user?.id, router, stage, onboardingCompleted, refetchPremium]);

  useEffect(() => {
    if (stage !== 'authRegister' && stage !== 'authLogin') return;
    const mode = stage === 'authRegister' ? 'register' : 'login';
    const key = `auth:${mode}`;
    if (viewedScreenEvents.has(key)) return;
    viewedScreenEvents.add(key);
    captureEvent('auth_screen_viewed', { mode });
  }, [stage]);

  useEffect(() => {
    if (stage !== 'goals') return;
    const key = 'goals_screen';
    if (viewedScreenEvents.has(key)) return;
    viewedScreenEvents.add(key);
    captureEvent('onboarding_goals_viewed');
  }, [stage]);

  useEffect(() => {
    if (stage !== 'install') return;
    const key = 'install_screen';
    if (viewedScreenEvents.has(key)) return;
    viewedScreenEvents.add(key);
    captureEvent('onboarding_install_viewed');
  }, [stage]);

  useEffect(() => {
    if (stage !== 'installInstruction' || !platform) return;
    const key = `instruction:${platform}`;
    if (viewedScreenEvents.has(key)) return;
    viewedScreenEvents.add(key);
    captureEvent('install_instruction_viewed', { platform });
  }, [platform, stage]);

  async function completeOnboarding() {
    let alreadySent = onboardingCompleteSent.current;
    if (typeof window !== 'undefined') {
      try {
        alreadySent =
          alreadySent || localStorage.getItem(ONBOARDING_EVENT_DONE_KEY) === 'true';
        localStorage.setItem(ONBOARDING_EVENT_DONE_KEY, 'true');
      } catch {
        // ignore
      }
    }

    if (session?.user) {
      const result = await markOnboardingCompleted();
      if (!result.ok) {
        console.error('[onboarding] failed to persist onboarding_completed', result.error);
      } else {
        clearOnboardingPendingAuthSession();
        clearOnboardingProgress();
      }
    }

    if (alreadySent) {
      onboardingCompleteSent.current = true;
      return;
    }
    onboardingCompleteSent.current = true;
    captureEvent('onboarding_completed', {
      platform,
    });
  }

  function toggleGoal(goal: string) {
    setSelectedGoals((prev) => {
      const next = prev.includes(goal) ? prev.filter((v) => v !== goal) : [...prev, goal];
      persistProgress({ selectedGoals: next });
      if (!prev.includes(goal)) {
        captureEvent('goal_selected', { goal });
      }
      return next;
    });
  }

  function handleGoalsNext() {
    if (selectedGoals.length === 0) return;
    captureEvent('onboarding_goals_completed', { selected_count: selectedGoals.length });
    persistProgress({ selectedGoals, reachedInstall: false });
    setStage('sosDemo');
  }

  function handlePlatformSelect(nextPlatform: Platform) {
    setPlatform(nextPlatform);
    captureEvent('install_platform_selected', { platform: nextPlatform });
    setStage('installInstruction');
  }

  async function handleStartFreeTrialAndOpen() {
    if (onboardingCompleteSent.current || trialStarting) return;
    setTrialStarting(true);
    setTrialError(null);
    captureEvent('install_flow_completed', { platform });

    if (!session?.user) {
      setTrialError('Сначала войдите в аккаунт, чтобы активировать пробный период.');
      setTrialStarting(false);
      return;
    }

    try {
      const ensured = await ensureProfileForUser(supabase, session.user);
      if (!ensured.ok) {
        setTrialError(ensured.error);
        setTrialStarting(false);
        return;
      }

      const trial = await startFreeTrialClient();

      if (trial.ok) {
        if (!trial.state.isPremium) {
          setTrialError('Пробный период не активировался. Попробуйте ещё раз.');
          setTrialStarting(false);
          return;
        }
        applyPremiumState(trial.state);
        markTrialActivationPending();
      } else if (trial.code === 'trial_already_used') {
        const premium = await refetchPremium();
        if (premium?.isPremium) {
          applyPremiumState(premium);
          markTrialActivationPending();
        } else {
          setTrialError(
            'Пробный период уже был использован для этого аккаунта. Откройте Reset+ в разделе подписки.',
          );
          setTrialStarting(false);
          return;
        }
      } else {
        setTrialError(trial.error);
        setTrialStarting(false);
        return;
      }

      await completeOnboarding();
      router.replace('/');
    } catch (e) {
      setTrialError(e instanceof Error ? e.message : 'Не удалось активировать пробный период');
      setTrialStarting(false);
      return;
    }

    setTrialStarting(false);
  }

  function handleBack() {
    if (stage === 'authLogin') {
      setStage('authRegister');
      return;
    }
    if (stage === 'goals') {
      if (!session?.user) {
        setStage('authRegister');
      }
      return;
    }
    if (stage === 'sosDemo') {
      setStage('goals');
      return;
    }
    if (stage === 'install') {
      setStage('sosDemo');
      return;
    }
    if (stage === 'installInstruction') {
      setStage('install');
    }
  }

  const canGoBackFromGoals = !session?.user;

  return (
    <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[#0B0B0C] px-4 py-5 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            stage === 'sosDemo'
              ? SOS_PAGE_GLOW
              : 'radial-gradient(circle at 50% 20%, rgba(167, 139, 250, 0.12), rgba(9, 12, 20, 0) 60%)',
        }}
      />
      <div className="relative z-10 flex min-h-0 flex-1">
        {stage === 'authRegister' ? (
          <OnboardingOtpPanel
            mode="register"
            hideBack
            onSwitchToLogin={() => setStage('authLogin')}
            onSwitchToRegister={() => setStage('authRegister')}
            onBack={() => undefined}
          />
        ) : null}

        {stage === 'authLogin' ? (
          <OnboardingOtpPanel
            mode="login"
            onSwitchToLogin={() => setStage('authLogin')}
            onSwitchToRegister={() => setStage('authRegister')}
            onBack={() => setStage('authRegister')}
          />
        ) : null}

        {stage === 'goals' ? (
          <>
            {canGoBackFromGoals ? <BackButton onClick={handleBack} /> : null}
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col pt-[calc(70px+env(safe-area-inset-top))]">
              <h1 className="text-center text-2xl font-semibold text-white">
                Чего вы хотите достичь?
              </h1>
              <p className="text-body text-measure mx-auto mt-3 text-center text-sm text-[#9A9AA0]">
                Выберите то, что хотите улучшить в себе
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
                        className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition duration-200 ease-out ${
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
                <button
                  type="button"
                  onClick={handleGoalsNext}
                  disabled={selectedGoals.length === 0}
                  className={`primary-cta min-h-14 ${
                    selectedGoals.length === 0
                      ? 'cursor-not-allowed border-slate-400/20 bg-slate-900/60 text-white/45 hover:brightness-100'
                      : ''
                  }`}
                >
                  Далее
                </button>
              </div>
            </div>
          </>
        ) : null}

        {stage === 'sosDemo' ? (
          <>
            <BackButton onClick={handleBack} />
            <SosDemoStage
              initiallyCompleted={sosDemoCompleted}
              onStarted={() => {
                captureEvent('sos_demo_started');
              }}
              onCompleted={() => {
                setSosDemoCompleted(true);
                persistProgress({ sosDemoCompleted: true });
                captureEvent('sos_demo_completed');
              }}
              onContinue={() => {
                persistProgress({ sosDemoCompleted: true, reachedInstall: true });
                setStage('install');
              }}
            />
          </>
        ) : null}

        {stage === 'install' ? (
          <>
            <BackButton onClick={handleBack} />
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col pt-[calc(70px+env(safe-area-inset-top))] pb-[calc(16px+env(safe-area-inset-bottom))]">
              <h1 className="text-title text-measure mx-auto text-center text-2xl font-semibold text-white">
                Скачайте приложение, чтобы оно всегда было рядом
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
              <h1 className="text-center text-2xl font-semibold text-white">Следуйте инструкции</h1>
              <p className="text-body text-measure mt-2 text-center text-sm text-[#9A9AA0]">
                Это займет 10 секунд
              </p>
              <ol className="text-body mt-7 space-y-4 rounded-3xl border border-slate-300/20 bg-slate-900/60 p-5 text-sm text-[#D4D4D8] backdrop-blur-md">
                {platform === 'android' ? (
                  <>
                    <li>1. Нажмите на три точки в правом верхнем углу браузера</li>
                    <li>2. Выберите: Добавить на главный экран</li>
                    <li>3. Подтвердите установку</li>
                  </>
                ) : (
                  <>
                    <li>1. Нажмите кнопку Поделиться</li>
                    <li>2. Выберите: На экран Домой</li>
                    <li>3. Подтвердите добавление</li>
                  </>
                )}
              </ol>
              <div className="mt-auto pt-6">
                {trialError ? (
                  <p className="mb-3 text-center text-sm text-[#FFB6BD]" role="alert">
                    {trialError}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleStartFreeTrialAndOpen()}
                  disabled={trialStarting}
                  className="primary-cta min-h-14"
                >
                  {trialStarting
                    ? 'Активируем пробный период…'
                    : 'Начать 3 дня бесплатно'}
                </button>
                <p className="text-measure mt-3 text-center text-xs leading-relaxed text-[#9A9AA0]">
                  Пробный период активируется сразу. Списание не произойдёт автоматически — вы
                  попадёте в приложение с открытым Reset+.
                </p>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
