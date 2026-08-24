import { formatScore } from "@/lib/domain/format";
import { cn } from "@/lib/utils";
import type { Person } from "@/types";

/**
 * Resume readiness plus skill-test outcome in one column.
 *
 * Rendered as a labelled dot rather than a badge: the value is `None` on most
 * rows, and a repeated badge there would read as noise instead of signal.
 */
export function ReadinessCell({ person }: { person: Person }) {
  const { resume, skillTest } = person;
  const score = formatScore(skillTest.score ?? skillTest.rating);

  const state = resume.ready
    ? { label: "Ready", dot: "bg-success", text: "text-content" }
    : resume.submitted
      ? { label: "In review", dot: "bg-warning", text: "text-content" }
      : { label: "No resume", dot: "bg-line-strong", text: "text-content-subtle" };

  return (
    <div className="flex flex-col gap-1">
      <span className={cn("flex items-center gap-1.5 text-xs", state.text)}>
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", state.dot)} aria-hidden />
        {state.label}
      </span>

      <span className="pl-3 text-2xs text-content-subtle">
        {skillTest.taken ? (
          score ? (
            <>
              Test <span className="tabular text-content-muted">{score}</span>
            </>
          ) : (
            "Test taken"
          )
        ) : (
          "No test"
        )}
      </span>
    </div>
  );
}
