"use client";

import { ChevronRight, Download, Menu, Moon, RotateCcw, Search, Sun } from "lucide-react";

import { useRegistry } from "@/components/providers/registry-provider";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useTheme } from "@/hooks/use-theme";
import { buildPeopleCsv, downloadCsv } from "@/lib/domain/csv";
import { findNavItem } from "@/lib/navigation";

export interface TopbarProps {
  onOpenMobileNav: () => void;
  onOpenCommandPalette: () => void;
}

/**
 * Persistent top bar: breadcrumb trail, global search trigger and quick actions.
 */
export function Topbar({ onOpenMobileNav, onOpenCommandPalette }: TopbarProps) {
  const { activeFilter, visiblePeople, resetFilters, searchQuery } = useRegistry();
  const { theme, toggleTheme } = useTheme();
  const navItem = findNavItem(activeFilter);

  const hasActiveFilters = activeFilter !== "registered" || searchQuery.trim().length > 0;

  const handleExport = (): void => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`slink-${activeFilter}-${stamp}.csv`, buildPeopleCsv(visiblePeople));
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-canvas/85 px-3 backdrop-blur-md sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="lg:hidden"
      >
        <Menu className="h-4 w-4" aria-hidden />
      </Button>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-sm">
          <li className="hidden text-content-muted sm:block">Slink</li>
          <li aria-hidden className="hidden text-content-subtle sm:block">
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li className="hidden text-content-muted sm:block">Pipeline</li>
          <li aria-hidden className="hidden text-content-subtle sm:block">
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li className="min-w-0 truncate font-medium text-content" aria-current="page">
            {navItem.label}
          </li>
        </ol>
      </nav>

      {/* Global search trigger */}
      <button
        type="button"
        onClick={onOpenCommandPalette}
        className="group hidden h-8 w-64 items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-sm text-content-subtle shadow-xs transition-all duration-150 ease-in-out hover:border-line-strong hover:text-content-muted md:flex"
      >
        <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="flex-1 text-left">Search registrants…</span>
        <Kbd>⌘K</Kbd>
      </button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenCommandPalette}
        aria-label="Search"
        className="md:hidden"
      >
        <Search className="h-4 w-4" aria-hidden />
      </Button>

      {/* Quick actions */}
      <div className="flex items-center gap-1">
        {hasActiveFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            leading={<RotateCcw className="h-3.5 w-3.5" aria-hidden />}
            className="hidden sm:inline-flex"
          >
            Reset
          </Button>
        ) : null}

        <Button
          variant="secondary"
          size="sm"
          onClick={handleExport}
          disabled={visiblePeople.length === 0}
          leading={<Download className="h-3.5 w-3.5" aria-hidden />}
          title="Export the current view as CSV"
        >
          <span className="hidden sm:inline">Export</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" aria-hidden />
          ) : (
            <Moon className="h-4 w-4" aria-hidden />
          )}
        </Button>
      </div>
    </header>
  );
}
