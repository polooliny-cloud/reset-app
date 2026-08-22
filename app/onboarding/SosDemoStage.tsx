"use client";

import { IBM_Plex_Sans } from "next/font/google";
import { useEffect, useRef, useState } from "react";

import { SOS_TIMER_GLOW, SOS_TITLE_GRADIENT_CLASS } from "@/lib/sos/visual";

const plex = IBM_Plex_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700"],
});

export const SOS_DEMO_TEXTS = [
  "Когда возникает импульс, мозг запускает автоматическую дофаминовую цепочку.",
  "Эта цепочка формируется годами и срабатывает быстрее сознания.",
  "Короткая пауза в 40–90 секунд прерывает автоматизм на уровне префронтальной коры.",
  "В этот момент импульс перестаёт быть бессознательной реакцией и становится осознанным выбором.",
  "Именно этот механизм лежит в основе метода, который использует Reset.",
  "Вы только что прошли тот же процесс, который будет защищать вас в момент реальной тяги.",
] as const;

export const SOS_DEMO_TEXT_SECONDS = 6;
export const SOS_DEMO_DURATION_SECONDS = SOS_DEMO_TEXTS.length * SOS_DEMO_TEXT_SECONDS;

type Phase = "intro" | "running" | "done";

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getTextIndex(timeLeft: number): number {
  const elapsed = SOS_DEMO_DURATION_SECONDS - timeLeft;
  return Math.min(Math.floor(elapsed / SOS_DEMO_TEXT_SECONDS), SOS_DEMO_TEXTS.length - 1);
}

type Props = {
  initiallyCompleted?: boolean;
  onStarted: () => void;
  onCompleted: () => void;
  onContinue: () => void;
};

export function SosDemoStage({
  initiallyCompleted = false,
  onStarted,
  onCompleted,
  onContinue,
}: Props) {
  const [phase, setPhase] = useState<Phase>(initiallyCompleted ? "done" : "intro");
  const [timeLeft, setTimeLeft] = useState(SOS_DEMO_DURATION_SECONDS);
  const completedRef = useRef(initiallyCompleted);
  const onCompletedRef = useRef(onCompleted);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  useEffect(() => {
    if (phase !== "running") return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          if (!completedRef.current) {
            completedRef.current = true;
            window.setTimeout(() => {
              setPhase("done");
              onCompletedRef.current();
            }, 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const textIndex = getTextIndex(timeLeft);
  const currentText = SOS_DEMO_TEXTS[textIndex];

  function handleStart() {
    setTimeLeft(SOS_DEMO_DURATION_SECONDS);
    setPhase("running");
    onStarted();
  }

  return (
    <div
      className={`${plex.className} mx-auto flex w-full max-w-md flex-1 flex-col px-1 pt-[calc(70px+env(safe-area-inset-top))] pb-[calc(16px+env(safe-area-inset-bottom))]`}
    >
      {phase === "intro" ? (
        <div className="animate-onboarding-step flex flex-1 flex-col">
          <p className="text-center text-sm uppercase tracking-[0.18em] text-white/70">
            Главная функция приложения
          </p>
          <h1
            className={`mt-4 text-center text-[2rem] font-bold leading-tight sm:text-[2.35rem] ${SOS_TITLE_GRADIENT_CLASS}`}
          >
            Тревожная кнопка
          </h1>
          <p className="text-body text-measure mx-auto mt-5 max-w-sm text-center text-[15px] leading-relaxed text-[#C4C4C9]">
            Используй эту кнопку чтобы не сорваться. Она разрывает автоматический импульс.
          </p>
          <div className="mt-auto pt-8">
            <button type="button" onClick={handleStart} className="primary-cta min-h-14 py-4">
              Попробовать
            </button>
          </div>
        </div>
      ) : null}

      {phase === "running" ? (
        <div className="relative flex flex-1 flex-col items-center justify-center text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 aspect-square max-h-[min(80vh,20rem)] w-[min(100%,20rem)] -translate-x-1/2 -translate-y-1/2"
            style={{ background: SOS_TIMER_GLOW }}
          />
          <p className="relative z-10 text-6xl font-bold tabular-nums tracking-tight text-white sm:text-7xl">
            {formatTimer(timeLeft)}
          </p>
          <p
            key={`sos-demo-${textIndex}`}
            className="text-flow-heading relative z-10 mt-6 min-h-[6.5rem] max-w-sm text-lg font-medium leading-relaxed text-[#D4D4D8] motion-safe:animate-sos-phase-text sm:text-xl"
          >
            {currentText}
          </p>
        </div>
      ) : null}

      {phase === "done" ? (
        <div className="animate-onboarding-step flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-6xl font-bold tabular-nums tracking-tight text-white/90">00:00</p>
          <p className="text-flow-heading mt-6 max-w-sm text-lg font-medium leading-relaxed text-[#E8E8EC] sm:text-xl">
            Теперь вы знаете, как работает ваша главная защита.
          </p>
          <div className="mt-auto w-full pt-8">
            <button type="button" onClick={onContinue} className="primary-cta min-h-14 py-4">
              Открыть приложение
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
