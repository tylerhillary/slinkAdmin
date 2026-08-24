import { cn } from "@/lib/utils";

/** Keyboard hint chip, e.g. the ⌘K affordance in the global search field. */
export function Kbd({ children, className }: { children: string; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded border border-line",
        "bg-surface-subtle px-1 font-sans text-2xs font-medium text-content-subtle",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
