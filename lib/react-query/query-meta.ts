/**
 * Pass as `meta` on `useQuery` / `useInfiniteQuery` when the component already
 * renders an inline error — avoids duplicating the global QueryProvider banner.
 */
export const suppressGlobalQueryErrorMeta = {
  suppressGlobalError: true,
} as const;

export type AppQueryMeta = {
  suppressGlobalError?: boolean;
};
