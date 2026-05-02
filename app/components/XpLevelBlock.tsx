'use client';

import {
  getSkillLevel,
  getSkillProgress,
} from '@/lib/progression';

const barGradient =
  'linear-gradient(90deg, rgb(245 158 11), rgb(249 115 22), rgb(234 88 12))';

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
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#2A2A2E]">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${safePercent}%`,
              background: barGradient,
            }}
          />
        </div>
        <div className="min-w-[36px] text-center text-xs text-[#9A9AA0]">
          {displayPercent}%
        </div>
      </div>
    </div>
  );

  if (variant === 'stats') {
    return (
      <div className="mt-6 w-full">
        <div className="text-center text-4xl font-bold tabular-nums text-white">
          Уровень {skill.level}
        </div>
        <div className="text-flow mt-2 px-4 text-center text-lg font-normal leading-[1.45] text-[#9A9AA0]">
          {skill.title}
        </div>
        {progressBar}
      </div>
    );
  }

  return (
    <div className="mt-6 w-full text-center">
      <div className="mb-1 text-lg font-semibold text-white">
        Уровень {skill.level}
      </div>
      <div className="text-flow mb-3 text-base font-normal leading-[1.45] text-[#9A9AA0]">
        {skill.title}
      </div>
      {progressBar}
    </div>
  );
}
