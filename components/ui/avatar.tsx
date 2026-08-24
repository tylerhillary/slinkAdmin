import { initials } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

export interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-7 w-7 text-[10px]",
  lg: "h-9 w-9 text-xs",
} as const;

/**
 * Monogram avatar.
 *
 * Monochrome by design: in a dense queue, per-person hues fight the data for
 * attention. Identity is carried by the name, not the swatch.
 */
export function Avatar({ name, size = "md", className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-line",
        "bg-surface-subtle font-semibold uppercase tracking-wide text-content-subtle",
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
