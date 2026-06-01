import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export function PublicLegalPageShell({ title, children }: Props) {
  const topInset = "calc(8px + env(safe-area-inset-top))";
  const leftInset = "calc(16px + env(safe-area-inset-left))";

  return (
    <main className="app-shell min-h-screen">
      <div
        className="relative z-10 mx-auto w-full max-w-[760px] px-5"
        style={{
          paddingTop: "calc(48px + env(safe-area-inset-top))",
          paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
        }}
      >
        <Link
          href="/"
          aria-label="На главную"
          className="fixed z-50 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2.5 text-white/80 transition duration-200 ease-out hover:bg-white/10 hover:text-white"
          style={{ top: topInset, left: leftInset }}
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

        <h1 className="text-flow-heading text-2xl font-semibold text-white sm:text-[1.75rem]">
          {title}
        </h1>

        <div className="legal-prose mt-8 space-y-4 text-[15px] leading-[1.65] text-[#C4C4CA]">
          {children}
        </div>
      </div>
    </main>
  );
}

export function LegalH2({ children }: { children: ReactNode }) {
  return (
    <h2 className="!mt-8 text-base font-semibold text-white first:!mt-0 sm:text-lg">{children}</h2>
  );
}

export function LegalH3({ children }: { children: ReactNode }) {
  return <h3 className="!mt-5 text-sm font-semibold text-[#E8E8EC]">{children}</h3>;
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function LegalEmailLink() {
  return (
    <a
      href="mailto:resetapp.ru@gmail.com"
      className="text-violet-200/90 underline decoration-violet-200/30 underline-offset-2 transition hover:text-violet-100"
    >
      resetapp.ru@gmail.com
    </a>
  );
}

/** Только email (конец legal-страниц, без ФИО и ИНН). */
export function LegalEmailOnly() {
  return (
    <p>
      Email:
      <br />
      <LegalEmailLink />
    </p>
  );
}

/** Полные реквизиты только на /contacts. */
export function LegalRequisitesBlock() {
  return (
    <div className="mt-10 rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-3.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/25">
        Реквизиты
      </p>
      <div className="mt-3 space-y-2.5 text-[12px] leading-relaxed text-white/38">
        <p>
          Самозанятый:
          <br />
          Лежневич Сергей Николаевич
        </p>
        <p>
          ИНН:
          <br />
          390612081851
        </p>
        <p>
          Email:
          <br />
          <a
            href="mailto:resetapp.ru@gmail.com"
            className="text-white/45 underline decoration-white/20 underline-offset-2 transition hover:text-white/55"
          >
            resetapp.ru@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
