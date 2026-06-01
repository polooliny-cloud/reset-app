"use client";

export function OnboardingOtpBackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Назад"
      className="fixed left-4 z-40 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 py-2 pl-2.5 pr-3.5 text-white/80 backdrop-blur-md transition duration-200 ease-out hover:bg-white/10 hover:text-white sm:left-6"
      style={{ top: "calc(16px + env(safe-area-inset-top))" }}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none">
        <path
          d="M15 18L9 12L15 6"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-sm font-medium">Назад</span>
    </button>
  );
}
