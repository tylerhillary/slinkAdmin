"use client";

import { Download, MailCheck, MailX, X } from "lucide-react";

import { useRegistry } from "@/components/providers/registry-provider";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { buildPeopleCsv, downloadCsv } from "@/lib/domain/csv";
import { formatInteger } from "@/lib/domain/format";
import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { Person } from "@/types";
import type { RowSelection } from "@/hooks/use-row-selection";

export interface FilterToolbarProps {
  selection: RowSelection;
  /** Rows currently rendered, used to resolve batch targets. */
  rows: readonly Person[];
}

/**
 * Filter bar for the registration queue.
 *
 * Collapses into a batch-action bar the moment rows are selected, so the two
 * modes never compete for the same horizontal space.
 */
export function FilterToolbar({ selection, rows }: FilterToolbarProps) {
  const { activeFilter, setActiveFilter, searchQuery, setSearchQuery, counts, toggleMailed } =
    useRegistry();

  const selectedPeople = rows.filter((person) => selection.isSelected(person.id));

  const applyMailed = async (mailed: boolean): Promise<void> => {
    await Promise.all(
      selectedPeople
        .filter((person) => person.flags.mailed !== mailed)
        .map((person) => toggleMailed(person, mailed)),
    );
    selection.clear();
  };

  const exportSelected = (): void => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`slink-selection-${stamp}.csv`, buildPeopleCsv(selectedPeople));
  };

  if (selection.selectedCount > 0) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-accent/35 bg-accent-soft px-3 py-2">
        <span className="tabular text-xs font-medium text-accent">
          {formatInteger(selection.selectedCount)} selected
        </span>
        <span aria-hidden className="h-4 w-px bg-accent/25" />

        <Button
          variant="secondary"
          size="sm"
          onClick={() => void applyMailed(true)}
          leading={<MailCheck className="h-3.5 w-3.5" aria-hidden />}
        >
          Mark mailed
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void applyMailed(false)}
          leading={<MailX className="h-3.5 w-3.5" aria-hidden />}
        >
          Clear mailed
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={exportSelected}
          leading={<Download className="h-3.5 w-3.5" aria-hidden />}
        >
          Export
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={selection.clear}
          leading={<X className="h-3.5 w-3.5" aria-hidden />}
          className="ml-auto"
        >
          Clear
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      {/* Segment chips */}
      <div
        role="group"
        aria-label="Filter by segment"
        className="scrollbar-thin -mx-0.5 flex items-center gap-1 overflow-x-auto px-0.5 pb-0.5"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeFilter === item.filter;
          return (
            <button
              key={item.filter}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveFilter(item.filter)}
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs",
                "transition-all duration-150 ease-in-out",
                isActive
                  ? "border-accent/40 bg-accent-soft font-medium text-accent"
                  : "border-line bg-surface text-content-muted hover:border-line-strong hover:text-content",
              )}
            >
              {item.label}
              <span
                className={cn(
                  "tabular rounded px-1 py-px text-2xs font-semibold",
                  isActive ? "bg-accent/15" : "bg-surface-subtle text-content-subtle",
                )}
              >
                {formatInteger(counts[item.countKey])}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 lg:w-80">
        <SearchInput
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Filter by name, skill, email…"
          aria-label="Filter the registration queue"
        />
      </div>
    </div>
  );
}
