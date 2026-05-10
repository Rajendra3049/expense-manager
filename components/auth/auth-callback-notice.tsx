"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  authCallbackUserMessage,
  parseAuthCallback,
  stripAuthCallbackNoise,
  type ParsedAuthCallback,
} from "@/lib/auth/callback-params";

export function AuthCallbackNotice() {
  const [parsed, setParsed] = useState<ParsedAuthCallback | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const result = parseAuthCallback(window.location.search, window.location.hash);

    const cleaned = stripAuthCallbackNoise(
      window.location.pathname,
      window.location.search,
      window.location.hash,
    );

    const full = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (cleaned !== full) {
      window.history.replaceState(window.history.state, "", cleaned);
    }

    queueMicrotask(() => {
      if (result.status === "error") {
        setParsed(result);
      }
    });
  }, []);

  if (!parsed || parsed.status !== "error") {
    return null;
  }

  const message = authCallbackUserMessage(parsed);

  return (
    <div
      className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-900 shadow-sm dark:border-red-900 dark:bg-red-950/50 dark:text-red-100"
      role="alert"
      aria-live="polite"
    >
      <p className="font-medium">Email link issue</p>
      <p className="mt-1 text-red-800 dark:text-red-200">{message}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="cursor-pointer font-medium text-red-900 underline underline-offset-2 hover:no-underline dark:text-red-50"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="cursor-pointer font-medium text-red-900 underline underline-offset-2 hover:no-underline dark:text-red-50"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
