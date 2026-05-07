'use client';

import { useEffect, useState } from 'react';

const INSTALL_PLATFORM_KEY = 'install_platform' as const;

type InstallScreen = 'device' | 'ios' | 'android';

type InstallFlowModalProps = {
  open: boolean;
  onClose: () => void;
  onFinish: () => void;
  mode?: 'onboarding' | 'manual';
  onSkip?: () => void;
  showSkip?: boolean;
  skipLabel?: string;
  onPlatformSelect?: (platform: 'ios' | 'android') => void;
  onInstructionShown?: (platform: 'ios' | 'android') => void;
};

export function InstallFlowModal({
  open,
  onClose,
  onFinish,
  mode = 'manual',
  onSkip,
  showSkip = false,
  skipLabel = 'Продолжить без установки',
  onPlatformSelect,
  onInstructionShown,
}: InstallFlowModalProps) {
  const [screen, setScreen] = useState<InstallScreen>('device');

  useEffect(() => {
    if (!open) return;
    setScreen('device');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (screen === 'device') return;
    onInstructionShown?.(screen);
  }, [open, onInstructionShown, screen]);

  function handleSelect(platform: 'ios' | 'android') {
    try {
      localStorage.setItem(INSTALL_PLATFORM_KEY, platform);
    } catch {
      // ignore
    }
    onPlatformSelect?.(platform);
    setScreen(platform);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="surface-card w-full max-w-md p-6 sm:p-7">
        {screen === 'device' ? (
          <>
            <h2 className="text-title text-measure text-center text-2xl font-semibold text-white">
              Как ты будешь устанавливать?
            </h2>
            <p className="text-body text-measure mt-2 text-center text-sm text-[#9A9AA0]">
              Это займёт 10 секунд
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => handleSelect('ios')}
                className="selection-card min-h-14 w-full px-5 py-4 text-base font-semibold text-white"
              >
                iPhone
              </button>
              <button
                type="button"
                onClick={() => handleSelect('android')}
                className="selection-card min-h-14 w-full px-5 py-4 text-base font-semibold text-white"
              >
                Android
              </button>
            </div>
          </>
        ) : null}

        {screen === 'android' ? (
          <>
            <h2 className="text-title text-measure text-center text-2xl font-semibold text-white">
              Установка на Android
            </h2>
            <ol className="text-body text-measure mt-5 space-y-3 text-sm text-[#D4D4D8]">
              <li>1. Нажми на три точки в правом верхнем углу</li>
              <li>2. Выбери «Добавить на главный экран»</li>
              <li>3. Подтверди установку</li>
            </ol>
            <p className="text-body text-measure mt-5 text-sm text-[#9A9AA0]">
              После этого открой приложение с экрана телефона
            </p>
            <p className="text-body text-measure mt-2 text-sm text-[#9A9AA0]">
              Когда добавишь на экран, открывай приложение оттуда
            </p>
            <button
              type="button"
              onClick={onFinish}
              className="primary-cta mt-6"
            >
              Открыть приложение
            </button>
          </>
        ) : null}

        {screen === 'ios' ? (
          <>
            <h2 className="text-title text-measure text-center text-2xl font-semibold text-white">
              Установка на iPhone
            </h2>
            <ol className="text-body text-measure mt-5 space-y-3 text-sm text-[#D4D4D8]">
              <li>1. Нажми кнопку «Поделиться»</li>
              <li>2. Выбери «На экран Домой»</li>
              <li>3. Нажми «Добавить»</li>
            </ol>
            <p className="text-body text-measure mt-5 text-sm text-[#9A9AA0]">
              После этого открой приложение с экрана телефона
            </p>
            <p className="text-body text-measure mt-2 text-sm text-[#9A9AA0]">
              Когда добавишь на экран, открывай приложение оттуда
            </p>
            <button
              type="button"
              onClick={onFinish}
              className="primary-cta mt-6"
            >
              Открыть приложение
            </button>
          </>
        ) : null}

        {mode === 'onboarding' && showSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="secondary-link mt-4 no-underline"
          >
            {skipLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="secondary-link mt-4"
          >
            Отмена
          </button>
        )}
      </div>
    </div>
  );
}
