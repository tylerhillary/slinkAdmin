"use client";

import { Check, UserRoundSearch } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { SkillChip } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { TutorMatch } from "@/types";

export interface TutorMatchListProps {
  matches: readonly TutorMatch[];
  selectedTutorId: string | null;
  onSelect: (tutorId: string) => void;
}

/**
 * Ranked tutor candidates for a learner.
 *
 * Ranking is skill-overlap only — the same rule the previous dashboard used —
 * computed client-side against the live registration snapshot.
 */
export function TutorMatchList({
  matches,
  selectedTutorId,
  onSelect,
}: TutorMatchListProps) {
  if (matches.length === 0) {
    return (
      <EmptyState
        icon={UserRoundSearch}
        title="No suitable tutor yet"
        description="No registrant currently teaches the skill this learner asked for."
        className="rounded-lg border border-dashed border-line py-10"
      />
    );
  }

  return (
    <ul className="space-y-2">
      {matches.map(({ tutor, overlapping }) => {
        const isSelected = tutor.id === selectedTutorId;

        return (
          <li key={tutor.id}>
            <button
              type="button"
              onClick={() => onSelect(tutor.id)}
              aria-pressed={isSelected}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border p-3 text-left",
                "transition-all duration-150 ease-in-out",
                isSelected
                  ? "border-accent/45 bg-accent-soft ring-1 ring-accent/15"
                  : "border-line bg-surface hover:border-line-strong hover:bg-surface-subtle/60",
              )}
            >
              <Avatar name={tutor.name} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-content">{tutor.name}</p>
                  {isSelected ? (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                    </span>
                  ) : null}
                </div>

                <p className="truncate text-2xs text-content-subtle">
                  {[tutor.email || "No email", tutor.phone || "No phone"].join(" · ")}
                </p>

                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {overlapping.map((skill) => (
                    <SkillChip key={skill} kind="teach">
                      {skill}
                    </SkillChip>
                  ))}
                </div>

                {tutor.location ? (
                  <p className="mt-1.5 text-2xs text-content-subtle">{tutor.location}</p>
                ) : null}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
