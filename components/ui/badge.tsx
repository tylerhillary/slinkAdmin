import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { PersonStatus } from "@/types";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

/**
 * Badges are neutral by default.
 *
 * Semantic colour is carried by a small dot rather than a filled background, so
 * a dense table reads as one calm grid instead of a field of coloured pills.
 */
const TONES: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface-subtle text-content-muted",
  accent: "border-accent/30 bg-accent-soft text-accent",
  success: "border-line bg-surface-subtle text-content-muted",
  warning: "border-line bg-surface-subtle text-content-muted",
  danger: "border-danger/25 bg-danger-soft text-danger",
  info: "border-line bg-surface-subtle text-content-muted",
};

const DOTS: Record<BadgeTone, string> = {
  neutral: "bg-content-subtle",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

export interface BadgeProps {
  tone?: BadgeTone;
  /** Shows the semantic status dot. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = "neutral", dot = false, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-1.5 py-[3px]",
        "text-2xs font-medium leading-none",
        TONES[tone],
        className,
      )}
    >
      {dot ? (
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOTS[tone])} aria-hidden />
      ) : null}
      {children}
    </span>
  );
}

/** Lifecycle badge for a registration. */
export function StatusBadge({ status }: { status: PersonStatus }) {
  return (
    <Badge tone={status === "connected" ? "success" : "warning"} dot>
      <span className="capitalize">{status}</span>
    </Badge>
  );
}

/** Count pill used by sidebar navigation and filter chips. */
export function CountPill({
  value,
  active = false,
  className,
}: {
  value: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "tabular inline-flex min-w-[1.5rem] items-center justify-center rounded px-1.5 py-0.5",
        "text-2xs font-semibold leading-none transition-colors duration-150",
        active ? "bg-accent/15 text-accent" : "bg-surface-subtle text-content-subtle",
        className,
      )}
    >
      {value}
    </span>
  );
}

/**
 * Skill token.
 *
 * Deliberately monochrome — the adjacent TEACH/LEARN gutter label already
 * carries the distinction, so colour would be redundant noise.
 */
export function SkillChip({
  children,
  kind = "learn",
}: {
  children: ReactNode;
  kind?: "teach" | "learn";
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-[11rem] items-center truncate rounded border px-1.5 py-[3px]",
        "text-2xs font-medium leading-none",
        kind === "teach"
          ? "border-line bg-surface-subtle text-content-muted"
          : "border-line bg-transparent text-content-muted",
      )}
      title={typeof children === "string" ? children : undefined}
    >
      {children}
    </span>
  );
}
