import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export function LegalPageShell({ title, children }: Props) {
  const topInset = "calc(8px + env(safe-area-inset-top))";

  return (
    <main className="app-shell flex min-h-screen flex-col px-4 pb-10 pt-5 sm:px-6">
      <div className="relative z-10 mx-auto w-full max-w-md flex-1 pt-12">
        <Link
          href="/subscription"
          aria-label="Назад"
          className="fixed left-4 z-50 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2.5 text-white/80 transition duration-200 ease-out hover:bg-white/10 hover:text-white sm:left-6"
          style={{ top: topInset }}
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
        </Link>

        <h1 className="text-flow-heading text-center text-2xl font-semibold text-white">{title}</h1>
        <div className="surface-card text-body text-measure mt-8 space-y-4 p-6 text-sm leading-relaxed text-[#C4C4CA]">
          {children}
        </div>
      </div>
    </main>
  );
}
