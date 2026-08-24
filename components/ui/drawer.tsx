"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Rendered inside the sticky header. */
  header: ReactNode;
  /** Rendered inside the sticky footer, if provided. */
  footer?: ReactNode;
  children: ReactNode;
  label: string;
  className?: string;
}

/**
 * Right-anchored detail panel.
 *
 * Mounts only while open so the scroll lock, focus move and enter animation all
 * run from a clean state each time.
 */
export function Drawer({
  open,
  onClose,
  header,
  footer,
  children,
  label,
  className,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus({ preventScroll: true });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={label}>
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in cursor-default bg-black/40 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-xl flex-col",
          "animate-slide-in-right border-l border-line bg-surface shadow-overlay outline-none",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">{header}</div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close panel"
            className="-mr-1 -mt-1 shrink-0"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer ? (
          <div className="border-t border-line bg-surface-subtle/60 px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
