"use client";

import { CornerDownLeft, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useRegistry } from "@/components/providers/registry-provider";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { formatInteger } from "@/lib/domain/format";
import { searchPeople } from "@/lib/domain/registry";
import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { FilterKey, Person } from "@/types";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

type Command =
  | { kind: "segment"; id: string; label: string; hint: string; filter: FilterKey }
  | { kind: "person"; id: string; label: string; hint: string; person: Person };

const MAX_PEOPLE_RESULTS = 6;

/**
 * Unified global search (⌘K / Ctrl+K).
 *
 * Searches the same in-memory snapshot the table renders, so results are
 * always consistent with what is on screen — no extra reads are issued.
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { people, counts, setActiveFilter, selectPerson } = useRegistry();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Command[]>(() => {
    const needle = query.trim().toLowerCase();

    const segments: Command[] = NAV_ITEMS.filter((item) =>
      needle ? item.label.toLowerCase().includes(needle) : true,
    ).map((item) => ({
      kind: "segment",
      id: `segment-${item.filter}`,
      label: item.label,
      hint: `${formatInteger(counts[item.countKey])} records`,
      filter: item.filter,
    }));

    const matches = needle ? searchPeople(people, needle) : people;
    const persons: Command[] = matches.slice(0, MAX_PEOPLE_RESULTS).map((person) => ({
      kind: "person",
      id: `person-${person.id}`,
      label: person.name,
      hint: person.email || person.location || "No contact on file",
      person,
    }));

    return [...segments, ...persons];
  }, [query, people, counts]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    // A timeout rather than requestAnimationFrame: rAF is suspended while the
    // tab is not compositing, which would leave the field unfocused on open.
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const run = (command: Command): void => {
    if (command.kind === "segment") {
      setActiveFilter(command.filter);
    } else {
      selectPerson(command.person);
    }
    onClose();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (commands.length ? (index + 1) % commands.length : 0));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        commands.length ? (index - 1 + commands.length) % commands.length : 0,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const command = commands[activeIndex];
      if (command) run(command);
    }
  };

  const segmentCommands = commands.filter((command) => command.kind === "segment");
  const personCommands = commands.filter((command) => command.kind === "person");

  return (
    <div
      className="fixed inset-0 z-[65] flex items-start justify-center p-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
    >
      <button
        type="button"
        aria-label="Dismiss search"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in cursor-default bg-black/45 backdrop-blur-[2px]"
      />

      <div
        role="presentation"
        onKeyDown={onKeyDown}
        className="relative w-full max-w-lg animate-scale-in overflow-hidden rounded-xl border border-line bg-surface shadow-overlay"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-3.5">
          <Search className="h-4 w-4 shrink-0 text-content-subtle" aria-hidden />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search registrants, skills, locations…"
            aria-label="Search registrants"
            className="h-12 flex-1 bg-transparent text-sm text-content outline-none placeholder:text-content-subtle"
          />
          <Kbd>Esc</Kbd>
        </div>

        <div ref={listRef} className="scrollbar-thin max-h-80 overflow-y-auto p-1.5">
          {commands.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-content-muted">
              No matches for “{query}”.
            </p>
          ) : null}

          {segmentCommands.length > 0 ? (
            <p className="px-2.5 pb-1 pt-2 text-2xs font-semibold uppercase tracking-widest text-content-subtle">
              Segments
            </p>
          ) : null}
          {segmentCommands.map((command) => {
            const index = commands.indexOf(command);
            return (
              <CommandRow
                key={command.id}
                active={index === activeIndex}
                onSelect={() => run(command)}
                onHover={() => setActiveIndex(index)}
              >
                <span className="flex-1 truncate text-left">{command.label}</span>
                <span className="tabular shrink-0 text-2xs text-content-subtle">
                  {command.hint}
                </span>
              </CommandRow>
            );
          })}

          {personCommands.length > 0 ? (
            <p className="px-2.5 pb-1 pt-3 text-2xs font-semibold uppercase tracking-widest text-content-subtle">
              Registrants
            </p>
          ) : null}
          {personCommands.map((command) => {
            const index = commands.indexOf(command);
            const person = command.kind === "person" ? command.person : null;
            if (!person) return null;

            return (
              <CommandRow
                key={command.id}
                active={index === activeIndex}
                onSelect={() => run(command)}
                onHover={() => setActiveIndex(index)}
              >
                <Avatar name={person.name} size="sm" />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm text-content">{person.name}</span>
                  <span className="block truncate text-2xs text-content-subtle">
                    {command.hint}
                  </span>
                </span>
                <StatusBadge status={person.status} />
              </CommandRow>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-line bg-surface-subtle/60 px-3.5 py-2">
          <span className="flex items-center gap-1.5 text-2xs text-content-subtle">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            to navigate
          </span>
          <span className="flex items-center gap-1.5 text-2xs text-content-subtle">
            <CornerDownLeft className="h-3 w-3" aria-hidden />
            to open
          </span>
        </div>
      </div>
    </div>
  );
}

function CommandRow({
  active,
  onSelect,
  onHover,
  children,
}: {
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseMove={onHover}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm",
        "transition-colors duration-150",
        active ? "bg-accent-soft text-accent" : "text-content-muted hover:bg-surface-subtle",
      )}
    >
      {children}
    </button>
  );
}
