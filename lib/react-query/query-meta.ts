/**
 * Pass as `meta` on `useQuery` / `useInfiniteQuery` when the component already
 * renders an inline error — avoids duplicating the global QueryProvider banner.
 */
export const suppressGlobalQueryErrorMeta = {
  suppressGlobalError: true,
} as const;

/**
 * Pass as `meta` on `useMutation` when the component already handles errors
 * locally (toast/inline), to avoid duplicate global toasts.
 */
export const suppressGlobalMutationErrorMeta = {
  suppressGlobalError: true,
} as const;

export type AppQueryMeta = {
  suppressGlobalError?: boolean;
};
