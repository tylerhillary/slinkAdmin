"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface RowSelection {
  selectedIds: ReadonlySet<string>;
  selectedCount: number;
  allSelected: boolean;
  someSelected: boolean;
  toggle: (id: string) => void;
  toggleAll: () => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
}

/**
 * Batch-selection state for a data table.
 *
 * Selection is pruned whenever the visible id set changes, so filtering or a
 * realtime delete can never leave an unreachable row selected.
 */
export function useRowSelection(visibleIds: readonly string[]): RowSelection {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  const visibleKey = visibleIds.join("|");

  useEffect(() => {
    setSelectedIds((current) => {
      if (current.size === 0) return current;
      const visible = new Set(visibleKey ? visibleKey.split("|") : []);
      const next = new Set([...current].filter((id) => visible.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [visibleKey]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const allSelected = visibleIds.length > 0 && selectedIds.size === visibleIds.length;

  const toggleAll = useCallback(() => {
    setSelectedIds((current) =>
      current.size === visibleIds.length ? new Set() : new Set(visibleIds),
    );
  }, [visibleIds]);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  return useMemo(
    () => ({
      selectedIds,
      selectedCount: selectedIds.size,
      allSelected,
      someSelected: selectedIds.size > 0 && !allSelected,
      toggle,
      toggleAll,
      clear,
      isSelected,
    }),
    [selectedIds, allSelected, toggle, toggleAll, clear, isSelected],
  );
}
