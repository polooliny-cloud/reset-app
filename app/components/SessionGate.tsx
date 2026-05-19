"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

import { isDevNavBypassActive } from "@/lib/dev/localNav";
import { useAuth } from "@/lib/auth/useAuth";

function SessionLoading() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-[#090d14]">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-violet-300"
        aria-hidden
      />
    </div>
  );
}

export function SessionGate({ children }: { children: ReactNode }) {
  const { session, initializing } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (initializing) return;
    if (isDevNavBypassActive()) return;
    if (session?.user) {
      redirectingRef.current = false;
      return;
    }
    if (pathname === "/onboarding") return;
    if (redirectingRef.current) return;
    redirectingRef.current = true;
    router.replace("/onboarding");
  }, [initializing, session, pathname, router]);

  if (initializing) {
    return <SessionLoading />;
  }

  if (!session?.user && pathname !== "/onboarding" && !isDevNavBypassActive()) {
    return <SessionLoading />;
  }

  return <>{children}</>;
}
