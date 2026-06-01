"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { LandingFooter } from "./LandingFooter";
import { setOnboardingPendingAuthSession } from "@/lib/onboarding";

const EDGE_OFFSET = 16;
const TOP_OFFSET = 8;
const HEADER_HEIGHT = 56;

const GAP_TWO_LINES = "calc(2 * 1.58 * 1.0625rem)";
const GAP_BEFORE_FEATURES = "clamp(4.5rem, 18vh, 7rem)";

type AccentTone = "violet" | "rose" | "soft";

const ACCENT_CLASS: Record<AccentTone, string> = {
  violet: "text-violet-200",
  rose: "text-rose-200",
  soft: "text-[#E8E8EC]",
};

function Accent({ children, tone = "violet" }: { children: ReactNode; tone?: AccentTone }) {
  return <span className={`font-semibold ${ACCENT_CLASS[tone]}`}>{children}</span>;
}

const FEATURE_BLOCKS = [
  {
    index: "01",
    title: "AI-поддержка",
    accent: "violet" as const,
    description: (
      <>
        <Accent>Персональные подсказки</Accent> в моменты риска.
      </>
    ),
  },
  {
    index: "02",
    title: "Подотчётность",
    accent: "violet" as const,
    description: (
      <>
        Отслеживание <Accent>серии воздержания</Accent> и награды с подробным описанием вашего
        состояния превращают выздоровление в ежедневную практику.
      </>
    ),
  },
  {
    index: "03",
    title: "Вмешательство",
    accent: "rose" as const,
    description: (
      <>
        <Accent tone="rose">Тревожная кнопка</Accent> активирует экстренную помощь, когда вас
        охватывают сильные позывы. Автоматический импульс становится{" "}
        <Accent tone="soft">осознанным выбором</Accent>.
      </>
    ),
  },
  {
    index: "04",
    title: "История прогресса и система уровней",
    accent: "violet" as const,
    description: (
      <>
        Побеждая свои позывы, вы прокачиваете <Accent>уровень самоконтроля</Accent>. Риск потери
        прогресса делает ваш мозг дисциплинированнее.
      </>
    ),
  },
] as const;

const FEATURE_ACCENT_BORDER: Record<(typeof FEATURE_BLOCKS)[number]["accent"], string> = {
  violet: "border-l-violet-400/55",
  rose: "border-l-rose-400/55",
};

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-px w-5 shrink-0 bg-violet-400/45" aria-hidden />
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-violet-200/75">
        {children}
      </p>
    </div>
  );
}

function SectionDivider() {
  return (
    <div
      className="h-px w-full bg-gradient-to-r from-violet-400/20 via-white/5 to-transparent"
      aria-hidden
    />
  );
}

function FeatureBlock({
  index,
  title,
  accent,
  description,
}: {
  index: string;
  title: string;
  accent: (typeof FEATURE_BLOCKS)[number]["accent"];
  description: ReactNode;
}) {
  return (
    <div
      className={`surface-card border-l-[3px] ${FEATURE_ACCENT_BORDER[accent]} border-white/[0.08] p-4 pl-4 sm:p-5 sm:pl-5`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 font-mono text-[11px] font-medium tabular-nums tracking-wider text-violet-300/55">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug text-white">{title}</h3>
          <p className="text-wrap-mobile mt-2 text-[14px] leading-[1.55] text-[#B0B8C8] sm:text-[15px]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const router = useRouter();
  const topInset = `calc(${TOP_OFFSET}px + env(safe-area-inset-top))`;
  const leftInset = `calc(${EDGE_OFFSET}px + env(safe-area-inset-left))`;
  const rightInset = `calc(${EDGE_OFFSET}px + env(safe-area-inset-right))`;
  const contentTop = `calc(${HEADER_HEIGHT}px + env(safe-area-inset-top) + 28px)`;

  function handleDownloadClick() {
    setOnboardingPendingAuthSession();
    router.push("/onboarding");
  }

  return (
    <div className="app-shell flex min-h-screen flex-col">
      <header
        className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#090d14]/88 backdrop-blur-md"
        style={{
          paddingTop: topInset,
          paddingLeft: leftInset,
          paddingRight: rightInset,
          paddingBottom: "12px",
        }}
      >
        <div className="flex h-11 items-center justify-between gap-3">
          <p className="text-left text-[1.1375rem] font-normal uppercase leading-none tracking-[0.18em] text-white/75">
            Reset
          </p>
          <button
            type="button"
            onClick={handleDownloadClick}
            className="shrink-0 rounded-full border border-violet-300/30 bg-violet-500/12 px-4 py-2 text-sm font-semibold text-violet-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_6px_16px_rgba(2,6,23,0.28)] transition duration-200 ease-out hover:border-violet-300/45 hover:bg-violet-500/20 active:scale-[0.98]"
          >
            Скачать
          </button>
        </div>
      </header>

      <main
        className="relative z-10 flex-1 overflow-y-auto"
        style={{
          paddingTop: contentTop,
          paddingBottom: "calc(48px + env(safe-area-inset-bottom))",
          paddingLeft: leftInset,
          paddingRight: rightInset,
        }}
        aria-label="Reset – о приложении"
      >
        <div className="mx-auto w-full max-w-lg text-left">
          {/* О нас + миссия */}
          <section>
            <SectionLabel>О нас</SectionLabel>
            <h1 className="text-title mt-4 text-[1.85rem] font-bold leading-[1.22] tracking-[-0.02em] text-white sm:text-[2.05rem]">
              Наша миссия – помочь мужчинам вновь{" "}
              <Accent tone="soft">почувствовать себя живыми</Accent>.
            </h1>
            <p className="text-body mt-5 text-[0.9375rem] leading-[1.55] text-[#8C9199] sm:text-[15px]">
              <Accent>RESET</Accent> – это приложение для восстановления после порнозависимости,
              основанное на <Accent tone="soft">ответственности</Accent>,{" "}
              <Accent tone="soft">вмешательстве в режиме реального времени</Accent> и отказе
              позволить стыду одержать победу.
            </p>
          </section>

          {/* Манифест */}
          <section style={{ marginTop: GAP_TWO_LINES }}>
            <p className="text-wrap-mobile text-[1.0625rem] font-semibold leading-[1.58] text-white/92 sm:text-[17px]">
              Миллионы мужчин изолированы, страдают от зависимости и тихо борются с ней –{" "}
              <Accent tone="rose">и никто не говорит им правду</Accent>. Порнография –{" "}
              <Accent tone="soft">не настоящая проблема</Accent>. Это симптом более глубокого
              кризиса, связанного с разобщенностью, подавленными эмоциями и стыдом. Мы создали{" "}
              <Accent>RESET</Accent>, чтобы <Accent tone="violet">разорвать этот порочный круг</Accent>.
            </p>
          </section>

          {/* Программа RESET */}
          <section style={{ marginTop: GAP_BEFORE_FEATURES }}>
            <h2 className="text-title text-[1.25rem] font-bold leading-[1.28] tracking-[-0.02em] text-white sm:text-[1.35rem]">
              Как <Accent>RESET</Accent> помогает мужчинам восстановиться
            </h2>
            <p className="text-body mt-4 text-[11px] leading-[1.55] text-[#7A8088] sm:text-xs">
              Программа <Accent>RESET</Accent> направлена на устранение поведенческих, психологических
              и социальных причин зависимости от порнографии с помощью:
            </p>

            <div className="mt-7 space-y-3 sm:mt-8">
              {FEATURE_BLOCKS.map((block) => (
                <FeatureBlock
                  key={block.title}
                  index={block.index}
                  title={block.title}
                  accent={block.accent}
                  description={block.description}
                />
              ))}
            </div>
          </section>

          <div className="mt-10 sm:mt-12">
            <SectionDivider />
          </div>

          {/* Главная особенность */}
          <section className="mt-8 pb-4 sm:mt-10">
            <SectionLabel>Главная особенность</SectionLabel>

            <div className="surface-card mt-5 border border-rose-400/15 border-white/[0.08] p-5 shadow-[0_12px_28px_rgba(69,10,10,0.12)] sm:p-6">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-rose-300/90 shadow-[0_0_10px_rgba(251,113,133,0.55)]"
                  aria-hidden
                />
                <h2 className="text-lg font-semibold leading-snug text-rose-50">
                  Тревожная кнопка
                </h2>
              </div>
              <p className="text-wrap-mobile mt-3 text-[15px] leading-[1.55] text-[#B0B8C8]">
                Когда возникает желание, вы нажимаете{" "}
                <Accent tone="rose">одну кнопку</Accent>.
              </p>
              <p className="text-wrap-mobile mt-4 text-[15px] leading-[1.55] text-[#B0B8C8]">
                Этот момент <Accent tone="soft">самоанализа</Accent> разрывает автоматический цикл.
                Импульс перестаёт быть бессознательным и становится{" "}
                <Accent tone="violet">сознательным выбором</Accent>, который вы делаете.
              </p>
              <p className="text-wrap-mobile mt-4 text-[14px] leading-[1.55] text-[#9A9AA0]">
                Приложение <Accent>RESET</Accent>, основанное на методах самоанализа из
                когнитивно-поведенческой терапии, является единственным приложением для
                выздоровления, использующим{" "}
                <Accent tone="violet">самоконфронтацию в реальном времени</Accent> в качестве
                инструмента управления тягой.
              </p>
            </div>
          </section>

          {/* CTA внизу страницы */}
          <section className="mt-12 pb-2 sm:mt-16">
            <p className="text-title text-center text-[1.35rem] font-bold leading-[1.28] tracking-[-0.02em] text-white sm:text-[1.5rem]">
              Восстановление начинается с{" "}
              <Accent tone="violet">одного решения</Accent>.
            </p>
            <button
              type="button"
              onClick={handleDownloadClick}
              className="primary-cta mt-6 w-full text-base"
            >
              Скачать
            </button>
          </section>

          <LandingFooter />
        </div>
      </main>
    </div>
  );
}
