"use client";

import { CheckCircle2, Clock3, Sparkles, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useRegistry } from "@/components/providers/registry-provider";
import { MetricSkeleton } from "@/components/ui/skeleton";
import { formatInteger } from "@/lib/domain/format";
import { SEGMENT_TO_FILTER } from "@/lib/domain/registry";
import { cn } from "@/lib/utils";
import type { SegmentKey } from "@/types";

interface MetricDefinition {
  key: SegmentKey;
  label: string;
  icon: LucideIcon;
  /** Denominator used for the share-of-total footnote. */
  relativeTo?: SegmentKey;
}

const METRICS: readonly MetricDefinition[] = [
  { key: "registered", label: "Total Registrations", icon: Users },
  { key: "newSkill", label: "New Skills", icon: Sparkles, relativeTo: "registered" },
  { key: "connected", label: "Connected", icon: CheckCircle2, relativeTo: "registered" },
  { key: "pending", label: "Pending Review", icon: Clock3, relativeTo: "registered" },
] as const;

/**
 * KPI strip. Each tile doubles as a filter control for its segment — the
 * active one is reflected back through `aria-pressed` and an accent border.
 */
export function MetricGrid() {
  const { counts, activeFilter, setActiveFilter, loading } = useRegistry();

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => (
          <MetricSkeleton key={metric.key} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {METRICS.map(({ key, label, icon: Icon, relativeTo }) => {
        const value = counts[key];
        const filter = SEGMENT_TO_FILTER[key];
        const isActive = filter !== undefined && activeFilter === filter;

        const denominator = relativeTo ? counts[relativeTo] : 0;
        const share =
          relativeTo && denominator > 0 ? Math.round((value / denominator) * 100) : null;

        return (
          <button
            key={key}
            type="button"
            aria-pressed={isActive}
            onClick={() => filter && setActiveFilter(filter)}
            className={cn(
              "group relative overflow-hidden rounded-xl border bg-surface p-4 text-left",
              "transition-all duration-150 ease-in-out hover:border-line-strong hover:shadow-sm",
              isActive ? "border-accent/45 shadow-sm ring-1 ring-accent/15" : "border-line",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium text-content-muted">{label}</p>
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150",
                  isActive
                    ? "bg-accent-soft text-accent"
                    : "bg-surface-subtle text-content-subtle group-hover:text-content-muted",
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              </span>
            </div>

            <p className="tabular mt-3 text-3xl font-semibold tracking-tight text-content">
              {formatInteger(value)}
            </p>

            <p className="mt-1.5 text-2xs text-content-subtle">
              {share !== null ? (
                <>
                  <span className="tabular font-medium text-content-muted">{share}%</span> of
                  total intake
                </>
              ) : (
                "Across all segments"
              )}
            </p>
          </button>
        );
      })}
    </div>
  );
}
