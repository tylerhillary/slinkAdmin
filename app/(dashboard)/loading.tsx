import { Card } from "@/components/ui/card";
import { MetricSkeleton, Skeleton, TableSkeleton } from "@/components/ui/skeleton";

/** Route-level fallback. Mirrors the workspace's real geometry to avoid layout shift. */
export default function Loading() {
  return (
    <div className="space-y-4 sm:space-y-5" aria-busy aria-label="Loading dashboard">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <MetricSkeleton key={index} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card flush className="min-w-0">
          <div className="space-y-4 p-4 sm:p-5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-80 max-w-full" />
            <div className="flex gap-2">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-7 w-24 rounded-md" />
              ))}
            </div>
          </div>
          <div className="border-t border-line">
            <TableSkeleton />
          </div>
        </Card>

        <Card className="min-w-0 space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-16 w-full rounded-lg" />
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </Card>
      </div>
    </div>
  );
}
