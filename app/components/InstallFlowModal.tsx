'use client';

import { useEffect, useState } from 'react';

const INSTALL_PLATFORM_KEY = 'install_platform' as const;

type InstallScreen = 'device' | 'ios' | 'android';

type InstallFlowModalProps = {
  open: boolean;
  onClose: () => void;
  onFinish: () => void;
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
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#151517] p-6 shadow-[0_24px_50px_rgba(0,0,0,0.45)] sm:p-7">
        {screen === 'device' ? (
          <>
            <h2 className="text-center text-2xl font-semibold leading-[1.35] text-white">
              Как ты будешь устанавливать?
            </h2>
            <p className="mt-2 text-center text-sm leading-[1.45] text-[#9A9AA0]">
              Это займёт 10 секунд
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => handleSelect('ios')}
                className="min-h-14 w-full rounded-2xl border border-white/10 bg-[#1C1C1F] px-5 py-4 text-base font-semibold text-white transition duration-200 ease-out hover:bg-[#232327]"
              >
                iPhone
              </button>
              <button
                type="button"
                onClick={() => handleSelect('android')}
                className="min-h-14 w-full rounded-2xl border border-white/10 bg-[#1C1C1F] px-5 py-4 text-base font-semibold text-white transition duration-200 ease-out hover:bg-[#232327]"
              >
                Android
              </button>
            </div>
          </>
        ) : null}

        {screen === 'android' ? (
          <>
            <h2 className="text-center text-2xl font-semibold leading-[1.35] text-white">
              Установка на Android
            </h2>
            <ol className="mt-5 space-y-3 text-sm leading-[1.45] text-[#D4D4D8]">
              <li>1. Нажми на три точки в правом верхнем углу</li>
              <li>2. Выбери «Добавить на главный экран»</li>
              <li>3. Подтверди установку</li>
            </ol>
            <p className="mt-5 text-sm leading-[1.45] text-[#9A9AA0]">
              После этого открой приложение с экрана телефона
            </p>
            <p className="mt-2 text-sm leading-[1.45] text-[#9A9AA0]">
              Когда добавишь на экран, открывай приложение оттуда
            </p>
            <button
              type="button"
              onClick={onFinish}
              className="mt-6 min-h-12 w-full rounded-2xl border border-amber-300/20 bg-[#1C1C1F] px-5 py-3 text-base font-semibold text-white transition duration-200 ease-out hover:brightness-110"
            >
              Открыть приложение
            </button>
          </>
        ) : null}

        {screen === 'ios' ? (
          <>
            <h2 className="text-center text-2xl font-semibold leading-[1.35] text-white">
              Установка на iPhone
            </h2>
            <ol className="mt-5 space-y-3 text-sm leading-[1.45] text-[#D4D4D8]">
              <li>1. Нажми кнопку «Поделиться»</li>
              <li>2. Выбери «На экран Домой»</li>
              <li>3. Нажми «Добавить»</li>
            </ol>
            <p className="mt-5 text-sm leading-[1.45] text-[#9A9AA0]">
              После этого открой приложение с экрана телефона
            </p>
            <p className="mt-2 text-sm leading-[1.45] text-[#9A9AA0]">
              Когда добавишь на экран, открывай приложение оттуда
            </p>
            <button
              type="button"
              onClick={onFinish}
              className="mt-6 min-h-12 w-full rounded-2xl border border-amber-300/20 bg-[#1C1C1F] px-5 py-3 text-base font-semibold text-white transition duration-200 ease-out hover:brightness-110"
            >
              Открыть приложение
            </button>
          </>
        ) : null}

        {showSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="mt-4 block w-full text-center text-sm text-[#9A9AA0] transition duration-200 ease-out hover:text-white"
          >
            {skipLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="mt-4 block w-full text-center text-sm text-[#9A9AA0] transition duration-200 ease-out hover:text-white"
          >
            Позже
          </button>
        )}
      </div>
    </div>
  );
}
