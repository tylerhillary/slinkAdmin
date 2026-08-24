import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Removes internal padding so the card can host a flush data table. */
  flush?: boolean;
}

/** The single surface primitive every panel in the console is built from. */
export function Card({ flush = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-surface shadow-xs",
        !flush && "p-4 sm:p-5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Eyebrow label rendered above the title. */
  eyebrow?: ReactNode;
  /** Controls aligned to the trailing edge. */
  actions?: ReactNode;
  className?: string;
}

export function CardHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-2xs font-semibold uppercase tracking-widest text-content-subtle">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-lg font-semibold text-content">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-content-muted">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

/** Small uppercase label used to head dense metric groups. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-2xs font-semibold uppercase tracking-widest text-content-subtle",
        className,
      )}
    >
      {children}
    </p>
  );
}
