"use client";

import { Activity } from "lucide-react";

import { useRegistry } from "@/components/providers/registry-provider";
import { Card, Eyebrow } from "@/components/ui/card";
import { formatInteger } from "@/lib/domain/format";
import { SEGMENT_TO_FILTER } from "@/lib/domain/registry";
import { cn } from "@/lib/utils";
import type { SegmentKey } from "@/types";

interface AlertRow {
  key: SegmentKey;
  label: string;
  /** Above this count the row reads as elevated queue pressure. */
  threshold: number;
}

const ALERTS: readonly AlertRow[] = [
  { key: "pending", label: "Pending reviews", threshold: 10 },
  { key: "connected", label: "Connected this cycle", threshold: Number.POSITIVE_INFINITY },
  { key: "mailed", label: "Mailed candidates", threshold: Number.POSITIVE_INFINITY },
  { key: "newSkill", label: "New skill submissions", threshold: 15 },
] as const;

/**
 * Operational read-out for the active intake cycle.
 *
 * Every figure is derived from the same live snapshot as the queue — there is
 * no separate aggregate query to drift out of sync.
 */
export function OperationsPanel() {
  const { counts, setActiveFilter, activeFilter } = useRegistry();

  const total = counts.registered;
  const throughput = total > 0 ? Math.round((counts.connected / total) * 100) : 0;

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>Control Tower</Eyebrow>
          <h2 className="mt-1 text-base font-semibold text-content">Operations</h2>
        </div>
        <span className="flex items-center gap-1.5 rounded border border-line bg-surface-subtle px-1.5 py-0.5 text-2xs font-medium text-content-muted">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
          </span>
          Live
        </span>
      </div>

      {/* Throughput */}
      <div className="mt-4 rounded-lg border border-line bg-surface-subtle/50 p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-content-muted">Match throughput</span>
          <span className="tabular text-sm font-semibold text-content">{throughput}%</span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={throughput}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Share of registrations connected to a tutor"
        >
          <div
            className="h-full rounded-full bg-accent transition-all duration-500 ease-in-out"
            style={{ width: `${throughput}%` }}
          />
        </div>
        <p className="mt-2 text-2xs text-content-subtle">
          <span className="tabular">{formatInteger(counts.connected)}</span> of{" "}
          <span className="tabular">{formatInteger(total)}</span> learners linked to a tutor.
        </p>
      </div>

      {/* Queue pressure */}
      <ul className="mt-3 flex-1 divide-y divide-line">
        {ALERTS.map(({ key, label, threshold }) => {
          const value = counts[key];
          const elevated = value > threshold;
          const filter = SEGMENT_TO_FILTER[key];
          const isActive = filter !== undefined && filter === activeFilter;

          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => filter && setActiveFilter(filter)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 py-2.5 text-left",
                  "transition-colors duration-150",
                  isActive ? "text-accent" : "text-content-muted hover:text-content",
                )}
              >
                <span className="flex min-w-0 items-center gap-2 text-xs">
                  <Activity
                    className={cn(
                      "h-3 w-3 shrink-0",
                      elevated ? "text-warning" : "text-content-subtle",
                    )}
                    aria-hidden
                  />
                  <span className="truncate">{label}</span>
                </span>
                <span
                  className={cn(
                    "tabular shrink-0 rounded px-1.5 py-0.5 text-2xs font-semibold",
                    elevated
                      ? "bg-warning-soft text-warning"
                      : isActive
                        ? "bg-accent/15 text-accent"
                        : "bg-surface-subtle text-content-muted",
                  )}
                >
                  {formatInteger(value)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
