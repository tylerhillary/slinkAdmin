import "server-only";

import { adminDb } from "@/lib/firebase/admin";

import { resolveMemberUid } from "./accounts";

/** Where a tutorship happens, as the two members settled it. */
export interface VenueRecord {
  matchId: string;
  mode: "inPerson" | "online" | string;
  status: "pending" | "confirmed" | "rejected" | string;
  venueState: string;
  traineeState: string;
  city: string;
  addressLine: string;
  landmark: string;
  platform: string;
  joinDetail: string;
  skill: string;
  tutorUid: string;
  traineeUid: string;
  submittedAt: string | null;
  confirmedAt: string | null;
  /** The uid that accepted it. The rules pin this to the trainee. */
  confirmedBy: string;
}

/** One line of the append-only record of how a venue got where it is. */
export interface AuditEntry {
  outcome: string;
  actorUid: string;
  venueState: string;
  mode: string;
  at: string | null;
}

export interface TutorshipView {
  venue: VenueRecord | null;
  audit: AuditEntry[];
}

function iso(value: unknown): string | null {
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate(): Date }).toDate().toISOString();
  }
  return typeof value === "string" ? value : null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * The venue and its history for one registration.
 *
 * ## Why this can only live here
 *
 * `tutorships/{matchId}` is readable by its two members and nobody else — the
 * console is neither, so its browser client is refused. `venueAudit` is
 * `allow read: if false` for *every* client, deliberately: one of the two
 * people is the subject of it, and a log somebody can read is a log they will
 * argue with. Both are readable with the Admin SDK and nowhere else, which
 * makes this console the only place either can ever be shown.
 *
 * ## Why it looks two ways
 *
 * A venue is keyed by the match, and a match is keyed by the **learner's**
 * registration id. So for a learner the record is simply `tutorships/{id}`.
 * For a tutor it is filed under somebody else's id, and the only handle on it
 * is their own uid — hence the fallback query. Without it the drawer would
 * show a venue to one half of a tutorship and nothing to the other.
 */
export async function tutorshipFor(
  registrationId: string,
  fallbackUid: unknown,
): Promise<TutorshipView> {
  const db = adminDb();

  try {
    let doc = await db.collection("tutorships").doc(registrationId).get();

    if (!doc.exists) {
      const uid = await resolveMemberUid(registrationId, fallbackUid);
      if (!uid) return { venue: null, audit: [] };

      const asTutor = await db
        .collection("tutorships")
        .where("tutorUid", "==", uid)
        .limit(1)
        .get();

      const found = asTutor.docs[0];
      if (!found) return { venue: null, audit: [] };
      doc = found;
    }

    const data = doc.data() ?? {};
    const venue: VenueRecord = {
      matchId: doc.id,
      mode: str(data.mode),
      status: str(data.status) || "pending",
      venueState: str(data.venueState),
      traineeState: str(data.traineeState),
      city: str(data.city),
      addressLine: str(data.addressLine),
      landmark: str(data.landmark),
      platform: str(data.platform),
      joinDetail: str(data.joinDetail),
      skill: str(data.skill),
      tutorUid: str(data.tutorUid),
      traineeUid: str(data.traineeUid),
      submittedAt: iso(data.submittedAt),
      confirmedAt: iso(data.confirmedAt),
      confirmedBy: str(data.confirmedBy),
    };

    // Newest first, and capped: the desk wants the shape of what happened, not
    // every keystroke of a tutor who could not settle on an address.
    const log = await db
      .collection("venueAudit")
      .where("exchangeId", "==", doc.id)
      .limit(50)
      .get();

    const audit = log.docs
      .map((entry) => ({
        outcome: str(entry.get("outcome")),
        actorUid: str(entry.get("actorUid")),
        venueState: str(entry.get("venueState")),
        mode: str(entry.get("mode")),
        at: iso(entry.get("at")),
      }))
      // Sorted here rather than in the query, which would need a composite
      // index for one small read per drawer open.
      .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));

    return { venue, audit };
  } catch (error) {
    console.error(`Could not read the tutorship for ${registrationId}`, error);
    return { venue: null, audit: [] };
  }
}
