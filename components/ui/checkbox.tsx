"use client";

import { Check, Minus } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /** Renders the mixed state used by the table's select-all control. */
  indeterminate?: boolean;
  label?: string;
}

/**
 * Accessible checkbox: the native input stays in the DOM for keyboard and
 * screen-reader behaviour, with a styled box painted on top.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { indeterminate = false, label, className, checked, disabled, ...props },
  ref,
) {
  const state = indeterminate ? "mixed" : checked ? "on" : "off";

  return (
    <label
      className={cn(
        "group inline-flex cursor-pointer items-center gap-2",
        disabled && "cursor-not-allowed opacity-55",
        className,
      )}
    >
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-checked={indeterminate ? "mixed" : undefined}
          className="peer absolute inset-0 h-full w-full cursor-inherit appearance-none rounded-sm"
          {...props}
        />
        <span
          aria-hidden
          data-state={state}
          className={cn(
            "pointer-events-none flex h-4 w-4 items-center justify-center rounded-sm border",
            "transition-all duration-150 ease-in-out",
            "border-line-strong bg-surface",
            "group-hover:border-accent/60",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-accent-ring/40",
            "data-[state=on]:border-accent data-[state=on]:bg-accent",
            "data-[state=mixed]:border-accent data-[state=mixed]:bg-accent",
          )}
        >
          {indeterminate ? (
            <Minus className="h-3 w-3 text-white" strokeWidth={3} />
          ) : checked ? (
            <Check className="h-3 w-3 text-white" strokeWidth={3} />
          ) : null}
        </span>
      </span>
      {label ? <span className="text-xs text-content-muted">{label}</span> : null}
    </label>
  );
});
