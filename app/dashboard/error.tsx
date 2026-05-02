"use client";

import { useEffect } from "react";
import { getFriendlyErrorMessage } from "@/lib/errors/friendly-message";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/90 p-8 text-center dark:border-red-900 dark:bg-red-950/40">
      <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">
        This page could not be loaded
      </h2>
      <p className="mt-2 text-sm text-red-800 dark:text-red-200">
        {getFriendlyErrorMessage(error)}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-50 dark:border-red-800 dark:bg-red-950 dark:text-red-100 dark:hover:bg-red-900/50"
      >
        Try again
      </button>
    </div>
  );
}
