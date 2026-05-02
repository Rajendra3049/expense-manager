"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

export function DashboardHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();

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
          className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Expense Manager
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            Expenses
          </Link>
          <Link
            href="/dashboard/accounts"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            Accounts
          </Link>
          <Link
            href="/dashboard/debts"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            Debts
          </Link>
          <Link
            href="/dashboard/budget"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            Budget
          </Link>
          <Link
            href="/dashboard/analytics"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            Analytics
          </Link>
        </nav>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
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
