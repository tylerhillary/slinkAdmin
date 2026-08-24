import type {
  FilterKey,
  Person,
  SegmentCounts,
  SkillTestSnapshot,
  Submission,
} from "@/types";

import { setsIntersect } from "./format";

/** Predicates backing each queue segment. */
export const FILTERS: Record<FilterKey, (person: Person) => boolean> = {
  registered: () => true,
  "new-skill": (person) => person.flags.newSkill,
  "connected-skill": (person) => person.status === "connected",
  "pending-skill": (person) => person.status === "pending",
  "suggested-skill": (person) => person.flags.suggested,
  mailed: (person) => person.flags.mailed,
};

/** Maps a KPI/segment key onto the filter it activates. */
export const SEGMENT_TO_FILTER: Record<string, FilterKey> = {
  registered: "registered",
  newSkill: "new-skill",
  connected: "connected-skill",
  pending: "pending-skill",
  mailed: "mailed",
  suggested: "suggested-skill",
};

/**
 * Picks the submission that best represents a person's skill test.
 *
 * Candidates must share an identifier or an email with the person. Among those,
 * a numeric score wins over a rating, which wins over a bare `ready` flag.
 * A matched submission carrying none of the three is not selected — the
 * registration document's own values stay authoritative in that case.
 */
export function pickBestSubmission(
  person: Person,
  submissions: ReadonlyMap<string, Submission>,
): Submission | null {
  if (submissions.size === 0) return null;

  let best: Submission | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const submission of submissions.values()) {
    const matchesId = setsIntersect(person.linkKeys, submission.linkKeys);
    const matchesEmail = setsIntersect(person.emails, submission.emails);
    if (!matchesId && !matchesEmail) continue;

    let priority = Number.NEGATIVE_INFINITY;
    if (submission.score !== null) {
      priority = submission.score;
    } else if (submission.rating !== null) {
      priority = submission.rating;
    } else if (submission.ready) {
      priority = Number.POSITIVE_INFINITY;
    }

    if (priority > bestScore) {
      bestScore = priority;
      best = submission;
    }
  }

  return best;
}

/**
 * Folds the `submissions` collection into the registration view models.
 * Returns new objects — the inputs are never mutated.
 */
export function mergeSubmissions(
  people: readonly Person[],
  submissions: ReadonlyMap<string, Submission>,
): Person[] {
  return people.map((person) => {
    const base = person.skillTestBase;
    const merged: SkillTestSnapshot = {
      taken: base.taken,
      status: base.status,
      score: base.score,
      rating: base.rating,
      ready: base.ready,
    };

    const submission = pickBestSubmission(person, submissions);

    if (submission) {
      if (submission.score !== null) merged.score = submission.score;
      if (submission.rating !== null) merged.rating = submission.rating;
      merged.ready = submission.ready;
      merged.taken = submission.taken;
      merged.status =
        submission.status ||
        (merged.ready ? "ready" : merged.taken ? "completed" : "pending");
    } else {
      merged.status =
        merged.status || (merged.ready ? "ready" : merged.taken ? "completed" : "pending");
    }

    return {
      ...person,
      skillTest: merged,
      readyToTeach: merged.ready,
      skillTestSubmissionId: submission?.id ?? null,
    };
  });
}

/** Newest registrations first. */
export function sortByNewest(people: readonly Person[]): Person[] {
  return [...people].sort((a, b) => b.createdAtValue - a.createdAtValue);
}

/** Free-text search across name, skills, email and location. */
export function searchPeople(people: readonly Person[], query: string): Person[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...people];

  return people.filter((person) => {
    return (
      person.name.toLowerCase().includes(needle) ||
      person.email.toLowerCase().includes(needle) ||
      person.location.toLowerCase().includes(needle) ||
      person.skills.some((skill) => skill.toLowerCase().includes(needle))
    );
  });
}

export function filterPeople(people: readonly Person[], filter: FilterKey): Person[] {
  return people.filter(FILTERS[filter]);
}

export function countSegments(people: readonly Person[]): SegmentCounts {
  return people.reduce<SegmentCounts>(
    (counts, person) => {
      counts.registered += 1;
      if (person.flags.newSkill) counts.newSkill += 1;
      if (person.status === "connected") counts.connected += 1;
      if (person.status === "pending") counts.pending += 1;
      if (person.flags.suggested) counts.suggested += 1;
      if (person.flags.mailed) counts.mailed += 1;
      return counts;
    },
    { registered: 0, newSkill: 0, connected: 0, pending: 0, suggested: 0, mailed: 0 },
  );
}
