"use client";

import { Inbox, Mail, Trash2, Undo2 } from "lucide-react";

import { ReadinessCell } from "@/components/modules/readiness-cell";
import { useRegistry } from "@/components/providers/registry-provider";
import { Avatar } from "@/components/ui/avatar";
import { SkillChip, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import type { RowSelection } from "@/hooks/use-row-selection";
import { cn } from "@/lib/utils";
import type { Person } from "@/types";

const MAX_VISIBLE_SKILLS = 2;

export interface RegistryTableProps {
  rows: readonly Person[];
  selection: RowSelection;
  loading: boolean;
}

/**
 * The registration queue.
 *
 * Fixed column widths at `md` and above so every row lands on the same grid;
 * below that the same fields re-flow into a stacked card.
 */
export function RegistryTable({ rows, selection, loading }: RegistryTableProps) {
  const { selectPerson, toggleMailed, setConnected, requestRemoval } = useRegistry();

  if (loading) return <TableSkeleton />;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No records match the current filters"
        description="Adjust the segment or clear the search to continue monitoring the intake queue."
      />
    );
  }

  return (
    <>
      {/* Desktop */}
      <div className="scrollbar-thin hidden overflow-x-auto md:block">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-10" />
            <col className="w-[27%]" />
            <col className="w-[30%]" />
            <col className="w-[13%]" />
            <col className="w-[15%]" />
            <col className="w-[15%]" />
          </colgroup>

          <thead>
            <tr className="border-b border-line bg-surface-subtle/40">
              <th scope="col" className="px-4 py-2">
                <Checkbox
                  checked={selection.allSelected}
                  indeterminate={selection.someSelected}
                  onChange={selection.toggleAll}
                  aria-label="Select all visible rows"
                />
              </th>
              <HeadCell>Registrant</HeadCell>
              <HeadCell>Skills</HeadCell>
              <HeadCell>Status</HeadCell>
              <HeadCell>Readiness</HeadCell>
              <HeadCell className="text-right">Actions</HeadCell>
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {rows.map((person) => {
              const isSelected = selection.isSelected(person.id);

              return (
                <tr
                  key={person.id}
                  onClick={() => selectPerson(person)}
                  className={cn(
                    "group cursor-pointer align-middle transition-colors duration-150",
                    isSelected ? "bg-accent-soft/40" : "hover:bg-surface-subtle/60",
                  )}
                >
                  <td className="px-4 py-2.5" onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => selection.toggle(person.id)}
                      aria-label={`Select ${person.name}`}
                    />
                  </td>

                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={person.name} />
                      <div className="min-w-0">
                        <p className="truncate text-[0.8125rem] font-medium leading-tight text-content">
                          {person.name}
                        </p>
                        <p className="mt-0.5 truncate text-2xs leading-tight text-content-subtle">
                          {person.email || "No email on file"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-2.5 pr-3">
                    <SkillMatrix person={person} />
                  </td>

                  <td className="py-2.5 pr-3">
                    <StatusBadge status={person.status} />
                  </td>

                  <td className="py-2.5 pr-3">
                    <ReadinessCell person={person} />
                  </td>

                  <td className="px-4 py-2.5" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-end gap-0.5 opacity-70 transition-opacity duration-150 group-hover:opacity-100">
                      <MailToggle
                        mailed={person.flags.mailed}
                        name={person.name}
                        onToggle={() => void toggleMailed(person, !person.flags.mailed)}
                      />
                      {person.status === "connected" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void setConnected(person, false)}
                          aria-label={`Move ${person.name} back to pending`}
                          title="Move back to pending"
                        >
                          <Undo2 className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      ) : (
                        <span className="h-8 w-8" aria-hidden />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => requestRemoval(person)}
                        aria-label={`Delete ${person.name}`}
                        title="Delete registration"
                        className="text-content-subtle hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="divide-y divide-line md:hidden">
        {rows.map((person) => {
          const isSelected = selection.isSelected(person.id);

          return (
            <li key={person.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => selectPerson(person)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectPerson(person);
                  }
                }}
                className={cn(
                  "flex w-full cursor-pointer flex-col gap-2.5 px-4 py-3 text-left",
                  "transition-colors duration-150",
                  isSelected ? "bg-accent-soft/40" : "active:bg-surface-subtle",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => selection.toggle(person.id)}
                      aria-label={`Select ${person.name}`}
                    />
                  </span>
                  <Avatar name={person.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.8125rem] font-medium leading-tight text-content">
                      {person.name}
                    </p>
                    <p className="mt-0.5 truncate text-2xs leading-tight text-content-subtle">
                      {person.email || "No email on file"}
                    </p>
                  </div>
                  <StatusBadge status={person.status} />
                </div>

                <SkillMatrix person={person} />

                <div className="flex items-center justify-between gap-3">
                  <ReadinessCell person={person} />
                  <div
                    className="flex items-center gap-0.5"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MailToggle
                      mailed={person.flags.mailed}
                      name={person.name}
                      onToggle={() => void toggleMailed(person, !person.flags.mailed)}
                    />
                    {person.status === "connected" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void setConnected(person, false)}
                        aria-label={`Move ${person.name} back to pending`}
                      >
                        <Undo2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => requestRemoval(person)}
                      aria-label={`Delete ${person.name}`}
                      className="text-content-subtle hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Icon toggle for the mailed flag. Lit only when set, so the column stays quiet. */
function MailToggle({
  mailed,
  name,
  onToggle,
}: {
  mailed: boolean;
  name: string;
  onToggle: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-pressed={mailed}
      onClick={onToggle}
      aria-label={mailed ? `Clear mailed flag for ${name}` : `Mark ${name} as mailed`}
      title={mailed ? "Mailed — click to clear" : "Mark as mailed"}
      className={cn(
        mailed ? "text-accent hover:bg-accent-soft" : "text-content-subtle",
      )}
    >
      <Mail className="h-3.5 w-3.5" aria-hidden />
    </Button>
  );
}

function HeadCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "py-2 pr-3 text-left text-2xs font-medium uppercase tracking-wider text-content-subtle",
        className,
      )}
    >
      {children}
    </th>
  );
}

/** Teach/learn skill tokens on a fixed gutter, truncated with an overflow count. */
function SkillMatrix({ person }: { person: Person }) {
  const renderRow = (label: string, skills: string[], kind: "teach" | "learn") => {
    const visible = skills.slice(0, MAX_VISIBLE_SKILLS);
    const overflow = skills.length - visible.length;

    return (
      <div className="flex min-w-0 items-center gap-2">
        <span className="w-10 shrink-0 text-2xs font-medium uppercase tracking-wider text-content-subtle">
          {label}
        </span>
        <div className="flex min-w-0 items-center gap-1 overflow-hidden">
          {visible.length > 0 ? (
            visible.map((skill) => (
              <SkillChip key={`${kind}-${skill}`} kind={kind}>
                {skill}
              </SkillChip>
            ))
          ) : (
            <span className="text-2xs text-content-subtle">—</span>
          )}
          {overflow > 0 ? (
            <span
              className="tabular shrink-0 text-2xs text-content-subtle"
              title={skills.slice(MAX_VISIBLE_SKILLS).join(", ")}
            >
              +{overflow}
            </span>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1">
      {renderRow("Teach", person.teachSkills, "teach")}
      {renderRow("Learn", person.learnSkills, "learn")}
    </div>
  );
}
