/**
 * Domain contracts for the Slink admin console.
 *
 * These describe the *view model* produced by `lib/adapters` from raw Firestore
 * documents. The Firestore schema itself is untouched — the adapters absorb the
 * historical field-name variance that has accumulated in the collections.
 */

/** Segments the console can filter the registration queue by. */
export type FilterKey =
  | "registered"
  | "new-skill"
  | "connected-skill"
  | "pending-skill"
  | "suggested-skill"
  | "mailed";

/** Keys used by KPI tiles, sidebar badges and queue metrics. */
export type SegmentKey =
  | "registered"
  | "newSkill"
  | "connected"
  | "pending"
  | "suggested"
  | "mailed";

export type SegmentCounts = Record<SegmentKey, number>;

/** Normalised lifecycle status. Firestore may store `verified`, which maps to `connected`. */
export type PersonStatus = "connected" | "pending";

export interface SkillTestSnapshot {
  taken: boolean;
  status: string;
  score: number | null;
  rating: number | null;
  ready: boolean;
}

export interface ResumeSnapshot {
  url: string;
  status: string;
  submitted: boolean;
  ready: boolean;
  updatedAtLabel: string;
}

export interface PersonFlags {
  newSkill: boolean;
  suggested: boolean;
  mailed: boolean;
}

export interface ConnectedTutorRef {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
}

/** A registration document, normalised for the UI. */
export interface Person {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  createdAtLabel: string;
  createdAtValue: number;
  status: PersonStatus;
  skills: string[];
  teachSkills: string[];
  learnSkills: string[];
  resume: ResumeSnapshot;
  readyForLinking: boolean;
  readyToTeach: boolean;
  skillTest: SkillTestSnapshot;
  /** Values derived from the registration doc alone, before submissions merge in. */
  skillTestBase: SkillTestSnapshot;
  skillTestSubmissionId: string | null;
  /** Identifiers this person can be matched on when joining the submissions collection. */
  linkKeys: ReadonlySet<string>;
  emails: ReadonlySet<string>;
  isProfessional: boolean;
  flags: PersonFlags;
  mailedAtLabel: string;
  connectedTutorId: string;
  connectedTutorName: string;
  connectedTutorLocation: string;
  connectedTutorEmail: string;
  connectedTutorPhone: string;
  connectedAtLabel: string;
  connectedAtValue: number;
  consent: boolean | null;
  source: string;
}

/** A skill-test document from the `submissions` collection. */
export interface Submission {
  id: string;
  score: number | null;
  rating: number | null;
  passingScore: number | null;
  taken: boolean;
  ready: boolean;
  status: string;
  linkKeys: ReadonlySet<string>;
  emails: ReadonlySet<string>;
}

/** A tutor candidate scored against a learner's desired skills. */
export interface TutorMatch {
  tutor: Person;
  overlapping: string[];
}

export type ToastTone = "success" | "warning" | "error";

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

/** Async lifecycle shared by the realtime collection hooks. */
export interface RealtimeState<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}
