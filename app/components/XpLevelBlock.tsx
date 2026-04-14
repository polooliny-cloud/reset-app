'use client';

import {
  getSkillLevel,
  getSkillProgress,
} from '@/lib/progression';

const barGradient =
  'linear-gradient(to right, rgb(239 68 68), rgb(234 179 8), rgb(34 197 94))';

type Variant = 'home' | 'stats';

export function XpLevelBlock({ xp, variant }: { xp: number; variant: Variant }) {
  const skill = getSkillLevel(xp);
  const progress = getSkillProgress(xp);
  const safePercent = Number.isFinite(progress.percent)
    ? Math.min(Math.max(progress.percent, 0), 100)
    : 0;
  const displayPercent = progress.isMax ? 100 : Math.floor(safePercent);

  const progressBar = (
    <div className="mx-auto mt-6 w-full max-w-xs">
      <div className="flex items-center justify-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${safePercent}%`,
              background: barGradient,
            }}
          />
        </div>
        <div className="min-w-[36px] text-center text-xs text-gray-600">
          {displayPercent}%
        </div>
      </div>
    </div>
  );

  if (variant === 'stats') {
    return (
      <div className="mt-6 w-full">
        <p className="text-center text-base font-medium text-gray-900">
          Уровень твоего самоконтроля
        </p>
        <div className="mt-4 text-center text-4xl font-bold tabular-nums text-gray-950">
          Уровень {skill.level}
        </div>
        <div className="mt-2 px-4 text-center text-gray-600">{skill.title}</div>
        {progressBar}
      </div>
    );
  }

  return (
    <div className="mt-6 w-full text-center">
      <p className="text-base font-medium text-gray-900">
        Уровень твоего самоконтроля
      </p>
      <div className="mb-1 mt-3 text-lg font-medium text-gray-700">
        Уровень {skill.level}
      </div>
      <div className="mb-3 text-sm text-gray-500">{skill.title}</div>
      {progressBar}
    </div>
  );
}
