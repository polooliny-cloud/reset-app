'use client';

import {
  getLevel,
  getProgress,
  getTitle,
} from '@/lib/progression';

const barGradient =
  'linear-gradient(to right, rgb(239 68 68), rgb(234 179 8), rgb(34 197 94))';

type Variant = 'home' | 'stats';

export function XpLevelBlock({ xp, variant }: { xp: number; variant: Variant }) {
  const level = getLevel(xp);
  const progress = getProgress(xp);
  const title = getTitle(level);

  const progressBar = (
    <div className="mx-auto w-full max-w-xs">
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${progress.percent}%`,
            background: barGradient,
          }}
        />
      </div>
      <div className="mt-1 text-center text-xs text-gray-600">
        {progress.current} / {progress.required} xp
      </div>
    </div>
  );

  if (variant === 'stats') {
    return (
      <div className="mt-6 w-full">
        <p className="text-center text-base font-medium text-gray-900">
          Уровень твоего самоконтроля
        </p>
        <div className="mt-4 text-center text-5xl font-bold tabular-nums text-gray-950">
          Уровень {level}
        </div>
        <div className="mt-2 text-center text-lg text-gray-600">{title}</div>
        <div className="mt-6">{progressBar}</div>
      </div>
    );
  }

  return (
    <div className="mt-6 w-full text-center">
      <p className="text-base font-medium text-gray-900">
        Уровень твоего самоконтроля
      </p>
      <div className="mb-1 mt-3 text-lg font-medium text-gray-700">
        Уровень {level}
      </div>
      <div className="mb-3 text-sm text-gray-500">{title}</div>
      {progressBar}
    </div>
  );
}
