"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "danger-soft";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-xs hover:bg-accent-hover active:translate-y-px disabled:bg-accent/40",
  secondary:
    "bg-surface text-content border border-line shadow-xs hover:bg-surface-subtle hover:border-line-strong active:translate-y-px",
  ghost: "text-content-muted hover:bg-surface-subtle hover:text-content",
  danger:
    "bg-danger text-white shadow-xs hover:bg-danger/90 active:translate-y-px disabled:bg-danger/40",
  "danger-soft":
    "bg-danger-soft text-danger border border-danger/25 hover:border-danger/45 hover:bg-danger-soft/70",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-7 gap-1.5 px-2.5 text-xs rounded",
  md: "h-8 gap-2 px-3 text-sm rounded-md",
  lg: "h-9 gap-2 px-4 text-sm rounded-md",
  icon: "h-8 w-8 justify-center rounded-md",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Rendered before the label. */
  leading?: ReactNode;
  /** Rendered after the label. */
  trailing?: ReactNode;
  /** Swaps the label for a pulsing state and blocks interaction. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    leading,
    trailing,
    loading = false,
    className,
    children,
    disabled,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      data-loading={loading || undefined}
      className={cn(
        "inline-flex select-none items-center whitespace-nowrap font-medium",
        "transition-all duration-150 ease-in-out",
        "disabled:pointer-events-none disabled:opacity-55",
        VARIANTS[variant],
        SIZES[size],
        loading && "animate-pulse",
        className,
      )}
      {...props}
    >
      {leading}
      {children}
      {trailing}
    </button>
  );
});
