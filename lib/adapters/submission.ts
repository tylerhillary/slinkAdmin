import type { QueryDocumentSnapshot } from "firebase/firestore";

import { firstBoolean, firstFinite, toKeySet } from "@/lib/domain/format";
import type { Submission } from "@/types";

import { spreadArray, type DocData } from "./coalesce";

/**
 * Normalises a `submissions` document.
 *
 * The collection has accumulated several generations of field names; every
 * historical spelling is still read here so no existing record stops resolving.
 */
export function adaptSubmission(snapshot: QueryDocumentSnapshot): Submission {
  const data = (snapshot.data() ?? {}) as DocData;

  const score = firstFinite([
    data.correctCount,
    data.correct_count,
    data.readinessScore,
    data.score,
    data.totalScore,
    data.resultScore,
    data.overallScore,
    data.rating,
  ]);

  const rating = firstFinite([data.rating, data.average, data.meanScore]);

  const passingScore = firstFinite([
    data.passingScore,
    data.threshold,
    data.minimumScore,
    data.passMark,
    data.passing,
  ]);

  const takenFlag =
    firstBoolean([data.taken, data.completed, data.submitted, data.isComplete]) ??
    (score !== null ? true : null);

  const readyFlag = firstBoolean([
    data.ready,
    data.isReady,
    data.readyToTeach,
    data.passed,
    data.isQualified,
  ]);

  const statusRaw = typeof data.status === "string" ? data.status.toLowerCase() : "";

  const linkKeys = toKeySet([
    snapshot.id,
    data.code,
    data.registrationId,
    data.registrantId,
    data.personId,
    data.personID,
    data.profileId,
    data.profileID,
    data.userId,
    data.userID,
    data.uid,
    data.tutorId,
    data.tutorID,
  ]);

  const emails = toKeySet([
    data.email,
    data.userEmail,
    data.contactEmail,
    data.loginEmail,
    ...spreadArray(data.emails),
    ...spreadArray(data.contactEmails),
  ]);

  let ready = readyFlag;
  if (ready === null && score !== null && passingScore !== null) {
    ready = score >= passingScore;
  }
  if (ready === null && takenFlag === true && (score !== null || rating !== null)) {
    ready = true;
  }

  const status =
    statusRaw || (ready ? "ready" : takenFlag ? "completed" : "pending");

  return {
    id: snapshot.id,
    score,
    rating,
    passingScore,
    taken: takenFlag ?? Boolean(score ?? rating),
    ready: ready ?? false,
    status,
    linkKeys,
    emails,
  };
}
