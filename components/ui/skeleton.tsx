import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} aria-hidden />;
}

/** Placeholder matching the KPI strip's geometry. */
export function MetricSkeleton() {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-16" />
      <Skeleton className="mt-3 h-3 w-20" />
    </div>
  );
}

/** Placeholder rows matching the registry table's geometry. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line" aria-busy>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="hidden h-5 w-24 rounded md:block" />
          <Skeleton className="hidden h-5 w-20 rounded lg:block" />
          <Skeleton className="h-5 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}
