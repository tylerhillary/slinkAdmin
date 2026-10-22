import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { adaptPerson } from "@/lib/adapters/person";
import {
  buildConnectionMailto,
  buildMatchNotifications,
} from "@/lib/domain/email";
import { adminDb } from "@/lib/firebase/admin";
import { consentedContacts, resolveMemberUid } from "@/lib/server/accounts";
import { NotAllowed, errorResponse, requireAdmin } from "@/lib/server/guard";

/**
 * Every write the console performs.
 *
 * One route with a named action rather than five endpoints, because they share
 * the same guard, the same collection handles and the same failure shape — and
 * because a fifth endpoint is where somebody eventually forgets the guard.
 *
 * The document shapes below are copied verbatim from the browser mutations
 * they replace, so existing records, the mail worker and anything else reading
 * these fields keep working unchanged. The only thing that moved is *who*
 * performs the write.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Action =
  | { action: "setMailed"; personId: string; mailed: boolean }
  | { action: "connect"; learnerId: string; tutor: ConnectedTutor }
  | { action: "revertToPending"; personId: string }
  | { action: "queueMail"; learnerId: string; tutorId: string }
  | { action: "remove"; personId: string };

interface ConnectedTutor {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
}

/** A document id the caller supplied. Never interpolated, only ever `.doc(id)`. */
function documentId(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new NotAllowed(400, `Missing ${field}.`);
  }
  // Firestore ids cannot contain a slash; rejecting one stops a crafted value
  // from addressing a different collection through the same call.
  if (value.includes("/")) {
    throw new NotAllowed(400, `Malformed ${field}.`);
  }
  return value;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * The first of these that is actually a name, or null.
 *
 * `text` returns "" for anything missing, so `text(a) ?? text(b)` never
 * reaches b — and an empty string stamped as a partner name reads on the
 * member's screen as having been matched with nobody. Null is the honest
 * value for "we do not have their name", and the app can say so.
 */
function firstName(...values: unknown[]): string | null {
  for (const value of values) {
    const name = text(value).trim();
    if (name) return name;
  }
  return null;
}

export async function POST(request: Request) {
  // Set by `connect`, returned to the caller so the admin's mail client can
  // be opened with a draft the browser had no way to compose.
  let connectionMailto = "";

  try {
    await requireAdmin(request);

    const body = (await request.json()) as Partial<Action>;
    const db = adminDb();
    const registrations = db.collection("registrations");

    switch (body.action) {
      case "setMailed": {
        const id = documentId((body as { personId?: unknown }).personId, "personId");
        const mailed = Boolean((body as { mailed?: unknown }).mailed);
        await registrations.doc(id).update({
          mailed,
          mailedAt: mailed ? FieldValue.serverTimestamp() : null,
        });
        break;
      }

      case "connect": {
        const id = documentId((body as { learnerId?: unknown }).learnerId, "learnerId");
        const tutor = ((body as { tutor?: ConnectedTutor }).tutor ?? {}) as ConnectedTutor;

        const registration = await registrations.doc(id).get();

        await registrations.doc(id).update({
          status: "connected",
          connectedTutorId: text(tutor.id),
          connectedTutorName: text(tutor.name),
          connectedTutorEmail: text(tutor.email),
          connectedTutorPhone: text(tutor.phone),
          connectedTutorLocation: text(tutor.location),
          connectedAt: FieldValue.serverTimestamp(),
        });

        // Tell both members.
        //
        // Connecting is the desk's real decision, and until now it landed only
        // in `registrations` — a collection the member is forbidden to read.
        // Their app sat on "Verification and shortlisting" forever, counting
        // down a timer that reported nothing. `users/{uid}` is the one
        // document that is both writable here and readable by them.
        //
        // Two changes from the first version of this, both of which it needed
        // to work at all:
        //
        // It stamps the **tutor** as well. Only the learner was told, so the
        // person expected to file a venue never learned they had been matched.
        //
        // And it finds the account by `directoryId` rather than insisting the
        // registration carries a `uid`. Of 40 live registrations only 2 have
        // one — everybody else registered on the website, before there was an
        // account to attach. The app writes `users/{uid}.directoryId` when a
        // member signs in and claims their registration, and that is the link
        // that actually exists. Reading only `registrations.uid` meant all 13
        // connections made so far reached nobody.
        const learnerUid = await resolveMemberUid(id, registration.get("uid"));
        const tutorUid = tutor.id ? await resolveMemberUid(tutor.id, null) : null;

        // What they were matched on. `selectedSkill` is what the learner asked
        // for, which is the thing being taught; both sides of a tutorship are
        // named by the same skill.
        const matchSkill = firstName(
          registration.get("selectedSkill"),
          registration.get("learnSkill"),
        );

        // The draft the admin's mail client opens is built here too, for the
        // same reason the queued mail is: it names the tutor's contact
        // details, and those are only readable with the Admin SDK.
        const tutorContacts = await consentedContacts(tutor.id, null);
        connectionMailto = buildConnectionMailto(
          adaptPerson(registration),
          adaptPerson(await registrations.doc(tutor.id).get()),
          tutorContacts,
        );

        await Promise.all([
          stampMatch(learnerUid, {
            matchId: id,
            matchRole: "trainee",
            partnerName: firstName(tutor.name),
            partnerUid: tutorUid,
            matchSkill,
          }),
          stampMatch(tutorUid, {
            matchId: id,
            matchRole: "tutor",
            partnerName: firstName(
              registration.get("fullName"),
              registration.get("name"),
            ),
            partnerUid: learnerUid,
            matchSkill,
          }),
        ]);
        break;
      }

      case "revertToPending": {
        const id = documentId((body as { personId?: unknown }).personId, "personId");
        const registration = await registrations.doc(id).get();

        // Put both members' own view back too, or their apps would keep
        // showing an introduction the desk has just withdrawn — and the tutor
        // would still be able to file a venue for it.
        const revertedLearnerUid = await resolveMemberUid(
          id,
          registration.get("uid"),
        );
        const revertedTutorId = registration.get("connectedTutorId");
        const revertedTutorUid =
          typeof revertedTutorId === "string" && revertedTutorId.trim()
            ? await resolveMemberUid(revertedTutorId, null)
            : null;

        await Promise.all([
          stampMatch(revertedLearnerUid, null),
          stampMatch(revertedTutorUid, null),
        ]);

        await registrations.doc(id).update({
          status: "pending",
          connectedTutorId: null,
          connectedTutorName: null,
          connectedTutorEmail: null,
          connectedTutorPhone: null,
          connectedTutorLocation: null,
          connectedAt: null,
          // Was `new Date()` in the browser version, which recorded whatever
          // the admin's laptop clock said. The server's clock is the one the
          // rest of these documents are stamped with.
          revertedAt: FieldValue.serverTimestamp(),
        });
        break;
      }

      case "queueMail": {
        // Built here rather than in the browser, and that is not a tidy-up.
        //
        // The introduction carries each member's contact details, and those
        // now live in `users/{uid}/contacts` — a collection whose rules are
        // `allow read: if isOwner(uid)`. The console's client is signed in as
        // an admin, not as either member, so it cannot read them. Only the
        // Admin SDK can, which puts the whole of this on the server.
        //
        // The browser therefore sends two ids and nothing else. It could not
        // send a finished payload even if it wanted to: it cannot see what
        // goes in one.
        const learnerId = documentId(
          (body as { learnerId?: unknown }).learnerId,
          "learnerId",
        );
        const tutorId = documentId(
          (body as { tutorId?: unknown }).tutorId,
          "tutorId",
        );

        const [learnerDoc, tutorDoc] = await Promise.all([
          registrations.doc(learnerId).get(),
          registrations.doc(tutorId).get(),
        ]);
        if (!learnerDoc.exists || !tutorDoc.exists) {
          throw new NotAllowed(404, "One of those registrations is gone.");
        }

        const [learnerContacts, tutorContacts] = await Promise.all([
          consentedContacts(learnerId, learnerDoc.get("uid")),
          consentedContacts(tutorId, tutorDoc.get("uid")),
        ]);

        const payloads = buildMatchNotifications(
          adaptPerson(learnerDoc),
          adaptPerson(tutorDoc),
          learnerContacts,
          tutorContacts,
        );
        if (payloads.length === 0) break;

        const batch = db.batch();
        const mailQueue = db.collection("mailQueue");
        for (const payload of payloads) {
          batch.set(mailQueue.doc(), {
            ...payload,
            createdAt: FieldValue.serverTimestamp(),
          });
        }
        await batch.commit();
        break;
      }

      case "remove": {
        const id = documentId((body as { personId?: unknown }).personId, "personId");
        await registrations.doc(id).delete();
        break;
      }

      default:
        throw new NotAllowed(400, "Unknown action.");
    }

    return NextResponse.json({ ok: true, mailto: connectionMailto });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Records the desk's decision on the member's own account record.
 *
 * `registrations` holds names, emails and phone numbers and is closed to
 * clients by design, so nothing the desk writes there can ever reach the
 * person it is about. `users/{uid}` can: the member may read their own
 * document, and the security rules freeze these three fields against client
 * writes so a stage is something the desk grants rather than something an
 * account can claim for itself.
 *
 * Silent when the registration carries no uid, which is every one filed from
 * the website: the site has no sign-in, so there is no account to stamp and no
 * app view of theirs to update. Those members are reached by email instead.
 */
interface MatchStamp {
  matchId: string;
  matchRole: "tutor" | "trainee";
  partnerName: string | null;
  partnerUid: string | null;
  /** What the desk matched them on, so the app never has to guess it. */
  matchSkill: string | null;
}



/**
 * Records the desk's decision on the member's own account record.
 *
 * Passing null for `match` withdraws it — the member goes back to waiting and
 * anything hanging off the match, a filed venue included, stops applying.
 *
 * `users/{uid}` is the only document that is both writable here and readable
 * by the member, so it is where the two halves of this product meet. The app's
 * security rules freeze every field written here against the client: a stage
 * somebody can set for themselves is not a verification, and a match somebody
 * can write for themselves is not an introduction.
 */
async function stampMatch(
  uid: string | null,
  match: MatchStamp | null,
): Promise<void> {
  if (!uid) return;

  try {
    await adminDb()
      .collection("users")
      .doc(uid)
      .set(
        {
          registrationStage: match === null ? "verifying" : "terms",
          stageUpdatedAt: FieldValue.serverTimestamp(),
          partnerName: match?.partnerName ?? null,
          // What the app needs to hang a tutorship venue off this match: a
          // stable key, which side of it this member is, and who the other
          // account is. Without the partner's uid the venue record could not
          // name its two members, and the rule that lets only the trainee
          // accept a venue would have nobody to check against.
          matchId: match?.matchId ?? null,
          matchRole: match?.matchRole ?? null,
          partnerUid: match?.partnerUid ?? null,
          // The app files a venue against a named skill. Deriving it from the
          // member's own profile would be a guess, and the pair this product
          // exists to find — two people whose skills overlap both ways — are
          // exactly the pair a guess gets wrong.
          matchSkill: match?.matchSkill ?? null,
          matchedAt: match === null ? null : FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  } catch (error) {
    // The registration write has already succeeded and is the record that
    // matters. A failure to mirror it costs the member a stale screen until
    // the next change, never the introduction itself.
    console.error(`Could not stamp the match for ${uid}`, error);
  }
}
