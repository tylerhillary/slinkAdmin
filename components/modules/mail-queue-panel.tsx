"use client";

import { MailX } from "lucide-react";

import { useRegistry } from "@/components/providers/registry-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatScore } from "@/lib/domain/format";

/**
 * Candidates in the automated assessment pipeline.
 *
 * Shown only while the mail segment is active, mirroring the previous
 * dashboard's behaviour.
 */
export function MailQueuePanel() {
  const { mailedPeople, selectPerson } = useRegistry();

  return (
    <Card flush>
      <div className="p-4 sm:p-5">
        <CardHeader
          eyebrow="Pipeline"
          title="Assessment Mail Queue"
          description="Candidates who have been sent the professional assessment invitation."
        />
      </div>

      {mailedPeople.length === 0 ? (
        <EmptyState
          icon={MailX}
          title="No candidates mailed yet"
          description="Mark a registrant as mailed from the queue to track them here."
        />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {mailedPeople.map((person) => {
            const score = formatScore(person.skillTest.score ?? person.skillTest.rating);

            return (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => selectPerson(person)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-subtle/70"
                >
                  <Avatar name={person.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-content">{person.name}</p>
                    <p className="truncate text-xs text-content-subtle">
                      {person.email || "No email on file"}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {score ? (
                      <Badge tone="success">
                        <span className="tabular">Score {score}</span>
                      </Badge>
                    ) : (
                      <span className="text-2xs text-content-subtle">No score yet</span>
                    )}
                    {person.mailedAtLabel ? (
                      <span className="text-2xs text-content-subtle">
                        Mailed {person.mailedAtLabel}
                      </span>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
