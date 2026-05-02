"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getFriendlyErrorMessage } from "@/lib/errors/friendly-message";
import type { AppQueryMeta } from "@/lib/react-query/query-meta";

type QueryProviderProps = {
  children: React.ReactNode;
};

export function QueryProvider({ children }: QueryProviderProps) {
  const [banner, setBanner] = useState<string | null>(null);

  const queryClient = useMemo(() => {
    const show = (err: unknown) => {
      setBanner(getFriendlyErrorMessage(err));
    };
    return new QueryClient({
      queryCache: new QueryCache({
        onError: (error, query) => {
          const meta = query.options.meta as AppQueryMeta | undefined;
          if (meta?.suppressGlobalError) return;
          show(error);
        },
      }),
      mutationCache: new MutationCache({
        onError: (error) => {
          show(error);
        },
      }),
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          retry: 1,
        },
      },
    });
  }, []);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 8000);
    return () => clearTimeout(t);
  }, [banner]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {banner ? (
        <div
          className="fixed bottom-4 left-1/2 z-50 max-w-lg -translate-x-1/2 px-4"
          role="alert"
        >
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-lg dark:border-red-900 dark:bg-red-950/90 dark:text-red-100">
            <p className="min-w-0 flex-1">{banner}</p>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="shrink-0 rounded-lg px-2 py-0.5 font-medium text-red-800 hover:bg-red-100 dark:text-red-200 dark:hover:bg-red-900/60"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </QueryClientProvider>
  );
}
