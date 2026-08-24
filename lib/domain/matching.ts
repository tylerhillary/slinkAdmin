import type { Person, TutorMatch } from "@/types";

/**
 * Ranks every other registrant as a possible tutor for `person`.
 *
 * A candidate qualifies when their `teachSkills` overlap the learner's
 * `learnSkills` (case-insensitive). More overlap ranks higher.
 */
export function getTutorMatches(
  person: Person,
  people: readonly Person[],
): TutorMatch[] {
  if (person.learnSkills.length === 0) return [];

  const desired = new Set(person.learnSkills.map((skill) => skill.toLowerCase()));

  return people
    .filter((candidate) => candidate.id !== person.id)
    .map((tutor) => ({
      tutor,
      overlapping: tutor.teachSkills.filter((skill) => desired.has(skill.toLowerCase())),
    }))
    .filter(({ overlapping }) => overlapping.length > 0)
    .sort((a, b) => b.overlapping.length - a.overlapping.length);
}

/** Skills a tutor can teach that the learner actually asked for. */
export function overlappingSkills(learner: Person, tutor: Person): string[] {
  const desired = new Set(learner.learnSkills.map((skill) => skill.toLowerCase()));
  return tutor.teachSkills.filter((skill) => desired.has(skill.toLowerCase()));
}
