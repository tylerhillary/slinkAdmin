"use client";

import { Search } from "lucide-react";
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Icon or adornment pinned to the left edge of the field. */
  leading?: ReactNode;
  /** Icon or adornment pinned to the right edge of the field. */
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leading, trailing, className, ...props },
  ref,
) {
  return (
    <div className="relative flex w-full items-center">
      {leading ? (
        <span className="pointer-events-none absolute left-2.5 flex items-center text-content-subtle">
          {leading}
        </span>
      ) : null}
      <input
        ref={ref}
        className={cn(
          "h-8 w-full rounded-md border border-line bg-surface text-sm text-content",
          "shadow-xs transition-all duration-150 ease-in-out",
          "hover:border-line-strong",
          "focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent-ring/25",
          "disabled:cursor-not-allowed disabled:opacity-60",
          leading ? "pl-8" : "pl-2.5",
          trailing ? "pr-8" : "pr-2.5",
          className,
        )}
        {...props}
      />
      {trailing ? (
        <span className="absolute right-2.5 flex items-center text-content-subtle">
          {trailing}
        </span>
      ) : null}
    </div>
  );
});

/** Input pre-wired with a search affordance. */
export const SearchInput = forwardRef<HTMLInputElement, InputProps>(
  function SearchInput(props, ref) {
    return (
      <Input
        ref={ref}
        type="search"
        leading={<Search className="h-3.5 w-3.5" aria-hidden />}
        {...props}
      />
    );
  },
);
