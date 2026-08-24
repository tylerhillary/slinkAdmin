"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { CommandPalette } from "@/components/modules/command-palette";
import { Sidebar } from "@/components/modules/sidebar";
import { Topbar } from "@/components/modules/topbar";
import { useHotkey } from "@/hooks/use-hotkey";

const COLLAPSE_STORAGE_KEY = "slink-admin-sidebar-collapsed";

/**
 * Enterprise layout shell: collapsible sidebar, persistent top bar and a
 * single scrolling content canvas.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true");
    } catch {
      // Storage is unavailable in some privacy modes; the default stands.
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      } catch {
        // Non-fatal.
      }
      return next;
    });
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useHotkey("k", (event) => {
    event.preventDefault();
    setPaletteOpen((previous) => !previous);
  }, { meta: true, allowInInput: true });

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenMobileNav={() => setMobileOpen(true)}
          onOpenCommandPalette={openPalette}
        />
        <main className="flex-1 px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  );
}
