import type { QueryDocumentSnapshot } from "firebase/firestore";

import {
  formatDateLabel,
  parseNumeric,
  readString,
  toEpochMillis,
  toKeySet,
  type DateLike,
} from "@/lib/domain/format";
import type { Person, PersonStatus, SkillTestSnapshot } from "@/types";

import { coalesce, spreadArray, type DocData } from "./coalesce";

const CONNECTED_STATUSES = ["connected", "verified"] as const;
const COMPLETED_TEST_STATUSES = ["completed", "passed", "ready", "finished"] as const;

function asDateLike(value: unknown): DateLike {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (value instanceof Date) return value;
  if (typeof value === "object" && typeof (value as { toDate?: unknown }).toDate === "function") {
    return value as { toDate: () => Date };
  }
  return null;
}

/**
 * Normalises a `registrations` document into the console's view model.
 *
 * Field-name fallbacks are preserved verbatim from the previous dashboard so
 * that every document already in Firestore keeps resolving identically.
 */
export function adaptPerson(snapshot: QueryDocumentSnapshot): Person {
  const data = (snapshot.data() ?? {}) as DocData;

  const rawStatus = String(data.status ?? "").toLowerCase();
  const status: PersonStatus = (CONNECTED_STATUSES as readonly string[]).includes(rawStatus)
    ? "connected"
    : "pending";

  const teachSkills = spreadArray(data.teachSkills).filter(
    (skill): skill is string => typeof skill === "string" && skill.length > 0,
  );
  const learnSkills =
    typeof data.selectedSkill === "string" && data.selectedSkill
      ? [data.selectedSkill]
      : [];
  const skills = [...new Set([...teachSkills, ...learnSkills])];

  // --- Resume ------------------------------------------------------------
  const resumeUrl = readString(
    coalesce([
      data.resumeUrl,
      data.resumeLink,
      data.resume,
      data.cvUrl,
      data.cv,
      data.portfolioResume,
    ]),
  );
  const resumeStatus = readString(
    coalesce([
      data.resumeStatus,
      data.resume_state,
      data.resumeApprovalStatus,
      data.resumeState,
    ]),
  );
  const resumeReady = Boolean(
    coalesce([
      data.readyForLinking,
      data.resumeApproved,
      data.resumeReady,
      data.professionalReady,
      data.isProfessional,
      data.professional,
      data.mentorReady,
      false,
    ]),
  );
  const resumeSubmitted = Boolean(resumeUrl);
  const resumeUpdatedLabel = resumeSubmitted
    ? formatDateLabel(
        asDateLike(
          coalesce([data.resumeUpdatedAt, data.resumeReviewedAt, data.resumeUpdated]),
        ),
      )
    : "";

  const isProfessional = Boolean(
    coalesce([
      data.isProfessional,
      data.professional,
      data.isMentor,
      data.profileType === "professional",
    ]),
  );

  // --- Join keys ---------------------------------------------------------
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

  // --- Skill test (registration-local values) ----------------------------
  const rawSkillTestScore = coalesce([
    data.skillTestScore,
    data.skillTestRating,
    data.skillTestResult,
    data.skillAssessmentScore,
    data.assessmentScore,
  ]);
  const parsedSkillTestScore = parseNumeric(rawSkillTestScore);
  const hasSkillTestScore = Number.isFinite(parsedSkillTestScore);

  const normalisedTestStatus =
    typeof data.skillTestStatus === "string" ? data.skillTestStatus.toLowerCase() : "";

  const skillTestTaken =
    Boolean(
      coalesce([
        data.skillTestTaken,
        data.skillTestCompleted,
        data.skillTestPassed,
        data.hasTakenSkillTest,
        data.readyToTeach,
        data.readyForTeaching,
      ]),
    ) ||
    (COMPLETED_TEST_STATUSES as readonly string[]).includes(normalisedTestStatus) ||
    hasSkillTestScore;

  const passingScoreRaw = data.skillTestPassingScore;
  const skillTestPassingScore =
    typeof passingScoreRaw === "number"
      ? passingScoreRaw
      : typeof passingScoreRaw === "string"
        ? Number.parseFloat(passingScoreRaw)
        : Number.NaN;

  const readyToTeach = Boolean(
    coalesce([
      data.readyToTeach,
      data.skillTestPassed,
      data.skillTestReady,
      skillTestTaken &&
        (!Number.isFinite(skillTestPassingScore) ||
          (hasSkillTestScore && parsedSkillTestScore >= skillTestPassingScore)),
    ]),
  );

  const skillTestStatus =
    normalisedTestStatus || (skillTestTaken ? "completed" : "pending");

  const explicitRating =
    typeof data.skillTestRating === "number"
      ? data.skillTestRating
      : typeof data.rating === "number"
        ? data.rating
        : null;
  const rating =
    explicitRating !== null && Number.isFinite(explicitRating)
      ? explicitRating
      : hasSkillTestScore
        ? parsedSkillTestScore
        : null;

  const skillTestBase: SkillTestSnapshot = {
    taken: skillTestTaken,
    status: skillTestStatus,
    score: hasSkillTestScore ? parsedSkillTestScore : null,
    rating,
    ready: readyToTeach,
  };

  return {
    id: snapshot.id,
    name: typeof data.fullName === "string" ? data.fullName : "Unknown registrant",
    email: readString(data.email),
    phone: readString(coalesce([data.phone, data.phoneNumber, data.contactNumber])),
    location: readString(data.location),
    createdAtLabel: formatDateLabel(asDateLike(data.createdAt)),
    createdAtValue: toEpochMillis(asDateLike(data.createdAt)),
    status,
    skills,
    teachSkills,
    learnSkills,
    resume: {
      url: resumeUrl,
      status: resumeStatus,
      submitted: resumeSubmitted,
      ready: resumeReady,
      updatedAtLabel: resumeUpdatedLabel,
    },
    readyForLinking: resumeReady,
    readyToTeach,
    skillTest: { ...skillTestBase },
    skillTestBase,
    skillTestSubmissionId: null,
    linkKeys,
    emails,
    isProfessional,
    flags: {
      newSkill: data.source === "client-submission",
      suggested: data.source === "ai-suggestion",
      mailed: Boolean(data.mailed),
    },
    mailedAtLabel: formatDateLabel(asDateLike(data.mailedAt)),
    connectedTutorId: readString(data.connectedTutorId),
    connectedTutorName: readString(data.connectedTutorName),
    connectedTutorLocation: readString(data.connectedTutorLocation),
    connectedTutorEmail: readString(data.connectedTutorEmail),
    connectedTutorPhone: readString(data.connectedTutorPhone),
    connectedAtLabel: formatDateLabel(asDateLike(data.connectedAt)),
    connectedAtValue: toEpochMillis(asDateLike(data.connectedAt)),
    consent: typeof data.consent === "boolean" ? data.consent : null,
    source: readString(data.source),
  };
}
