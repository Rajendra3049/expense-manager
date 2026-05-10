"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandMark } from "@/components/branding/brand-mark";
import { useAuth } from "@/components/providers/auth-provider";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";

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

export function DashboardHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  async function onSignOut() {
    await signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <BrandMark size="sm" />
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
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
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <ThemeToggleButton />
          <span className="hidden truncate text-sm text-zinc-600 sm:inline dark:text-zinc-400">
            {user?.email}
          </span>
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
