"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/lib/auth/useAuth";

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/");
    } finally {
      setSigningOut(false);
    }
  }

  const topInset = "calc(8px + env(safe-area-inset-top))";
  const leftInset = "calc(16px + env(safe-area-inset-left))";

  return (
    <main className="app-shell flex min-h-screen flex-col px-4 pb-8 pt-5 sm:px-6">
      <div className="relative z-10 flex min-h-0 flex-1 flex-col pt-12">
        <Link
          href="/"
          aria-label="Назад"
          className="fixed left-4 z-50 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2.5 text-white/80 transition duration-200 ease-out hover:bg-white/10 hover:text-white sm:left-6"
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

        <div className="mx-auto mt-10 flex w-full max-w-md flex-1 flex-col pt-8">
          <h1 className="text-flow-heading text-center text-2xl font-semibold text-white">
            Настройки
          </h1>
          {user?.email ? (
            <p className="text-flow mt-3 text-center text-sm text-[#9A9AA0]">{user.email}</p>
          ) : null}

          <div className="surface-card mt-8 p-6">
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="glass-danger w-full py-3 text-base font-semibold text-white transition duration-200 ease-out hover:brightness-110 disabled:opacity-60"
            >
              {signingOut ? "Выход…" : "Выйти из аккаунта"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
