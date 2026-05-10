"use client";

import Link from "next/link";
import { AuthCallbackNotice } from "@/components/auth/auth-callback-notice";
import { BrandMark } from "@/components/branding/brand-mark";
import { useAuth } from "@/components/providers/auth-provider";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";
import { APP_TAGLINE } from "@/lib/app-config";

const features = [
  {
    title: "Expenses & Budgets",
    description:
      "Log spending across accounts and categories, then set monthly budgets to stay on track.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="h-5 w-5"
      >
        <rect x="3" y="6" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </svg>
    ),
  },
  {
    title: "Investments & Debts",
    description:
      "Keep tabs on portfolios, EMIs, and outstanding dues — all in one consolidated view.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="h-5 w-5"
      >
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </svg>
    ),
  },
  {
    title: "Analytics & Insights",
    description:
      "Visualize trends with clean charts so you always know where your money is going.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="h-5 w-5"
      >
        <path d="M3 3v18h18" />
        <rect x="7" y="11" width="3" height="7" rx="0.5" />
        <rect x="13" y="7" width="3" height="11" rx="0.5" />
        <rect x="19" y="14" width="0" height="4" />
      </svg>
    ),
  },
];

export function LandingPage() {
  const { user, isLoading } = useAuth();

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-32 -top-32 h-80 w-80 animate-blob rounded-full bg-linear-to-br from-emerald-400/30 via-teal-400/20 to-transparent blur-3xl" />
        <div className="animation-delay-2000 absolute -top-20 right-0 h-96 w-96 animate-blob rounded-full bg-linear-to-br from-indigo-500/30 via-violet-500/20 to-transparent blur-3xl" />
        <div className="animation-delay-4000 absolute bottom-0 left-1/3 h-96 w-96 animate-blob rounded-full bg-linear-to-br from-rose-400/25 via-orange-400/15 to-transparent blur-3xl" />
        <div className="bg-grid absolute inset-0 opacity-[0.04] dark:opacity-[0.07]" />
      </div>

      <div className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
        <Link
          href="/"
          aria-label="Home"
          className="inline-flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <BrandMark size="sm" />
        </Link>
      </div>
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggleButton />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 sm:py-24">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10 text-center">
          <AuthCallbackNotice />

          <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/70 px-4 py-1.5 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/70 dark:text-zinc-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {APP_TAGLINE}
          </div>

          <div className="animate-fade-in-up animation-delay-100 space-y-5">
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl md:text-6xl">
              Take control of your{" "}
              <span className="bg-linear-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
                money
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-base text-zinc-600 dark:text-zinc-400 sm:text-lg">
              Track every expense, plan smarter budgets, monitor investments
              and debts, and see exactly where your finances stand — all in one
              place.
            </p>
          </div>

          {isLoading ? (
            <div
              className="h-12 w-full max-w-sm animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800 sm:max-w-none sm:w-96"
              aria-hidden
            />
          ) : user ? (
            <div className="animate-fade-in-up animation-delay-200">
              <Link
                href="/dashboard"
                className="group inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white shadow-lg shadow-zinc-900/10 transition-all hover:-translate-y-0.5 hover:shadow-xl dark:bg-zinc-100 dark:text-zinc-900 dark:shadow-black/30"
              >
                Go to dashboard
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="animate-fade-in-up animation-delay-200 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="group inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white shadow-lg shadow-zinc-900/10 transition-all hover:-translate-y-0.5 hover:shadow-xl dark:bg-zinc-100 dark:text-zinc-900 dark:shadow-black/30"
              >
                Get started free
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 bg-white/70 px-6 text-sm font-medium text-zinc-900 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                Sign in
              </Link>
            </div>
          )}

          <div className="animate-fade-in-up animation-delay-300 mt-6 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-zinc-200/80 bg-white/60 p-5 text-left shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500/15 to-teal-500/15 text-emerald-600 ring-1 ring-emerald-500/20 transition-transform group-hover:scale-110 dark:text-emerald-400">
                  {feature.icon}
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
