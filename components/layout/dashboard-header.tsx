"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { BrandMark } from "@/components/branding/brand-mark";
import { useAuth } from "@/components/providers/auth-provider";
import { useNavProgress } from "@/components/providers/nav-progress-provider";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";
import { Spinner } from "@/components/ui/spinner";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Expenses" },
  { href: "/dashboard/debts", label: "Debts" },
  { href: "/dashboard/recurring", label: "Recurring" },
  { href: "/dashboard/trips", label: "Trips" },
  { href: "/dashboard/accounts", label: "Accounts" },
  { href: "/dashboard/emis", label: "EMIs" },
  { href: "/dashboard/investments", label: "Investments" },
  { href: "/dashboard/budget", label: "Budget" },
  { href: "/dashboard/analytics", label: "Analytics" },
] as const;

function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function subscribeNoop() {
  return () => {};
}

export function DashboardHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const navProgress = useNavProgress();
  const menuId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isNavigating, startNavigation] = useTransition();

  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const isBusy = isSigningOut || isNavigating;

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const dismissMobileDrawer = useCallback(() => {
    setMobileOpen(false);
    queueMicrotask(() => menuButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      closeMobile();
    });
  }, [pathname, closeMobile]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismissMobileDrawer();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, dismissMobileDrawer]);

  useEffect(() => {
    if (!mobileOpen) return;
    closeButtonRef.current?.focus();
  }, [mobileOpen]);

  async function onSignOut() {
    if (isBusy) return;
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
    closeMobile();
    navProgress.start();
    startNavigation(() => {
      router.refresh();
      router.push("/login");
    });
  }

  const mobileDrawer =
    mounted && mobileOpen
      ? createPortal(
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 cursor-pointer bg-black/50 backdrop-blur-[2px]"
              onClick={dismissMobileDrawer}
            />
            <div
              id={menuId}
              role="dialog"
              aria-modal="true"
              aria-label="Main navigation"
              className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-l border-zinc-200 bg-white pt-[env(safe-area-inset-top,0px)] shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Menu
                </span>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={dismissMobileDrawer}
                  aria-label="Close menu"
                  className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    className="size-5"
                    aria-hidden
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav
                className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
                aria-label="Dashboard sections"
              >
                {NAV_ITEMS.map((item) => {
                  const isActive = isNavActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobile}
                      aria-current={isActive ? "page" : undefined}
                      className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                        isActive
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-zinc-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] dark:border-zinc-800">
                {user?.email ? (
                  <p className="mb-3 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {user.email}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void onSignOut()}
                  disabled={isBusy}
                  aria-busy={isBusy}
                  aria-disabled={isBusy}
                  title={isBusy ? "Signing you out…" : undefined}
                  className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  {isBusy ? (
                    <>
                      <Spinner className="size-3.5" />
                      <span>Signing out…</span>
                    </>
                  ) : (
                    "Sign out"
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-13 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="inline-flex min-w-0 shrink-0 items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <BrandMark size="sm" />
        </Link>

        <nav
          className="hidden min-w-0 flex-1 items-center gap-1 lg:flex"
          aria-label="Dashboard sections"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggleButton />
          <span className="hidden max-w-48 truncate text-sm text-zinc-600 xl:inline dark:text-zinc-400">
            {user?.email}
          </span>
          <button
            type="button"
            onClick={() => void onSignOut()}
            disabled={isBusy}
            aria-busy={isBusy}
            aria-disabled={isBusy}
            title={isBusy ? "Signing you out…" : undefined}
            className="hidden cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 lg:inline-flex dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            {isBusy ? (
              <>
                <Spinner className="size-3.5" />
                <span>Signing out…</span>
              </>
            ) : (
              "Sign out"
            )}
          </button>

          <button
            ref={menuButtonRef}
            type="button"
            className="inline-flex size-10 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 text-zinc-800 transition hover:bg-zinc-50 lg:hidden dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
            aria-expanded={mobileOpen}
            aria-controls={menuId}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                className="size-5"
                aria-hidden
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                className="size-5"
                aria-hidden
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {mobileDrawer}
    </header>
  );
}
