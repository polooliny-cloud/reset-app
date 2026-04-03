'use client';

import { IBM_Plex_Sans } from 'next/font/google';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { trackOnce } from '@/lib/analytics';

const DURATION_SECONDS = 90;

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

function getDynamicText(timeLeft: number): { title: string; subtitle: string } {
  if (timeLeft > 60) {
    return {
      title: 'ОСТАНОВИСЬ. НЕ ДЕЛАЙ ЭТОГО.',
      subtitle: 'СЕЙЧАС ЭТО ПРОСТО ИМПУЛЬС\nОН ПРОЙДЁТ',
    };
  }

  if (timeLeft > 30) {
    return {
      title: 'ТЫ СЕЙЧАС ТЕРЯЕШЬ КОНТРОЛЬ',
      subtitle: 'НЕ СЛИВАЙ СВОЙ ПРОГРЕСС\nРАДИ НЕСКОЛЬКИХ СЕКУНД',
    };
  }

  return {
    title: 'ОСТАЛОСЬ СОВСЕМ НЕМНОГО',
    subtitle: 'ДОЖДИСЬ КОНЦА\nТЫ УЖЕ СПРАВЛЯЕШЬСЯ',
  };
}

function getTextPhase(timeLeft: number): 1 | 2 | 3 {
  if (timeLeft > 60) return 1;
  if (timeLeft > 30) return 2;
  return 3;
}

export default function SosPage() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(DURATION_SECONDS);
  const { title, subtitle } = getDynamicText(timeLeft);
  const textPhase = getTextPhase(timeLeft);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft !== 0) return;
    trackOnce('sos_completed');
  }, [timeLeft]);

  return (
    <main
      className={`${plex.className} flex min-h-screen flex-col bg-gray-50 px-4 pb-8 pt-4`}
    >
      <div className="w-full max-w-md self-start px-1 pt-2">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 rounded-lg px-1 py-2 text-gray-800 hover:bg-gray-100 hover:text-gray-950"
        >
          <span aria-hidden className="text-xl leading-none">
            ←
          </span>
          <span className="text-base font-medium">Назад</span>
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-8 text-center">
        <p
          key={`sos-title-${textPhase}`}
          className="max-w-md text-balance text-lg font-bold uppercase leading-snug text-gray-900 transition-opacity duration-300 motion-safe:animate-sos-phase-text sm:text-xl"
        >
          {title}
        </p>

        <p className="text-5xl font-bold tabular-nums tracking-tight text-gray-950 sm:text-6xl">
          {formatTimer(timeLeft)}
        </p>

        <p
          key={`sos-sub-${textPhase}`}
          className="max-w-md whitespace-pre-line text-base font-medium leading-snug text-gray-700 transition-opacity duration-300 motion-safe:animate-sos-phase-text"
        >
          {subtitle}
        </p>
      </div>
    </main>
  );
}
