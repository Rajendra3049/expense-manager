"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/errors/friendly-message";
import type { AppQueryMeta } from "@/lib/react-query/query-meta";

type QueryProviderProps = {
  children: React.ReactNode;
};

export function QueryProvider({ children }: QueryProviderProps) {
  const queryClient = useMemo(() => {
    const show = (err: unknown) => {
      toast.error(getFriendlyErrorMessage(err));
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
        onError: (error, _variables, _context, mutation) => {
          const meta = mutation.options.meta as AppQueryMeta | undefined;
          if (meta?.suppressGlobalError) return;
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

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
