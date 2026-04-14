import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AnalyticsAppMount } from "./components/AnalyticsAppMount";
import { OnboardingDevReset } from "./components/OnboardingDevReset";
import { OnboardingGate } from "./components/OnboardingGate";
import { PostHogProvider } from "./components/PostHogProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Reset",
    template: "%s | Reset",
  },
  description: "Reset — контроль и дисциплина",
  icons: [
    { rel: "icon", url: "/favicon.png" },
    { rel: "apple-touch-icon", url: "/icons/icon-192.png" },
  ],
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="flex min-h-full flex-col">
        <PostHogProvider>
          <AnalyticsAppMount />
          <OnboardingGate>{children}</OnboardingGate>
          <OnboardingDevReset />
        </PostHogProvider>
      </body>
    </html>
  );
}
