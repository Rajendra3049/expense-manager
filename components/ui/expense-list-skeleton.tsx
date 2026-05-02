import { Skeleton } from "@/components/ui/skeleton";

export function ExpenseListSkeleton() {
  return (
    <section
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5"
      aria-busy="true"
      aria-label="Loading expenses"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" rounded="md" />
          <Skeleton className="h-3 w-40" rounded="md" />
        </div>
        <Skeleton className="h-9 w-24" rounded="lg" />
      </div>
      <div className="hidden space-y-2 md:block">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-4 w-24 shrink-0" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20 shrink-0" />
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </div>
        ))}
      </div>
    </section>
  );
}
