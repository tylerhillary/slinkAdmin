"use client";

import { useEffect, useRef } from "react";

interface HotkeyOptions {
  /** Match only when Ctrl (Windows/Linux) or Cmd (macOS) is held. */
  meta?: boolean;
  /** Fire even when focus is inside an input, textarea or contenteditable. */
  allowInInput?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

/** Binds a document-level keyboard shortcut for the lifetime of the component. */
export function useHotkey(
  key: string,
  handler: (event: KeyboardEvent) => void,
  { meta = false, allowInInput = false }: HotkeyOptions = {},
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      if (meta && !(event.metaKey || event.ctrlKey)) return;
      if (!meta && (event.metaKey || event.ctrlKey)) return;
      if (!allowInInput && isEditableTarget(event.target)) return;

      handlerRef.current(event);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, meta, allowInInput]);
}
