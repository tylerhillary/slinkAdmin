import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className,
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface-subtle text-content-subtle">
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-content">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-xs text-content-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
