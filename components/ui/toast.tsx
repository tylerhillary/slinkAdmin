"use client";

import { AlertTriangle, CheckCircle2, X, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Toast, ToastTone } from "@/types";

const TONE_STYLES: Record<ToastTone, { className: string; Icon: LucideIcon }> = {
  success: {
    className: "border-success/30 bg-success-soft text-success",
    Icon: CheckCircle2,
  },
  warning: {
    className: "border-warning/30 bg-warning-soft text-warning",
    Icon: AlertTriangle,
  },
  error: {
    className: "border-danger/30 bg-danger-soft text-danger",
    Icon: XCircle,
  },
};

export interface ToastViewportProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

/** Bottom-right stack. Rendered once, at the root of the provider tree. */
export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((toast) => {
        const { className, Icon } = TONE_STYLES[toast.tone];

        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex animate-toast-in items-start gap-2.5",
              "rounded-lg border px-3 py-2.5 shadow-lg backdrop-blur-sm",
              className,
            )}
          >
            <Icon className="mt-px h-4 w-4 shrink-0" aria-hidden />
            <p className="flex-1 text-xs font-medium leading-relaxed">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="-mr-0.5 shrink-0 rounded p-0.5 opacity-60 transition-opacity duration-150 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
