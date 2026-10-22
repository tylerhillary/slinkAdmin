import "server-only";

import { adminDb } from "@/lib/firebase/admin";

/** One way to be reached that a member has agreed may be passed on. */
export interface ConsentedContact {
  channel: string;
  value: string;
}

/** Whether an introduction would actually reach somebody. */
export interface Reach {
  /** They have signed in to the app and claimed their registration. */
  hasAccount: boolean;
  /** Channels they have agreed we may pass on. Zero means unreachable. */
  channels: number;
}

/**
 * Finds the app account belonging to a registration.
 *
 * Two links exist and only one of them is reliable. `registrations.uid` is
 * written when somebody registers *from the app*, which almost nobody does —
 * 2 of 40 live registrations carry it. `users/{uid}.directoryId` is written by
 * the app's identity bridge when a member signs in with Google and claims the
 * registration filed under that address, and it covers everybody who has ever
 * opened the app regardless of where they first registered.
 *
 * So the query is the primary and the field is the fallback, not the reverse.
 * Returns null when the person has no account, which is the normal case and
 * not an error: the desk still emails them, they simply see nothing in an app
 * they have not installed.
 */
export async function resolveMemberUid(
  registrationId: string,
  fallbackUid: unknown,
): Promise<string | null> {
  try {
    const linked = await adminDb()
      .collection("users")
      .where("directoryId", "==", registrationId)
      .limit(1)
      .get();

    const found = linked.docs[0];
    if (found) return found.id;
  } catch (error) {
    console.error(`Could not resolve an account for ${registrationId}`, error);
  }

  return typeof fallbackUid === "string" && fallbackUid.trim()
    ? fallbackUid.trim()
    : null;
}

/**
 * What a member has agreed may be passed on.
 *
 * Empty for anybody who has never opened the app, or who has opened it and
 * chosen nothing. Both are ordinary: the desk still emails them, the email
 * simply says so rather than handing over a number they never offered.
 *
 * Lives on the server because `users/{uid}/contacts` is `allow read: if
 * isOwner(uid)` — the console is signed in as an admin, not as either member,
 * so its browser client cannot read this at all. Only the Admin SDK can.
 */
export async function consentedContacts(
  registrationId: string,
  fallbackUid: unknown,
): Promise<ConsentedContact[]> {
  const uid = await resolveMemberUid(registrationId, fallbackUid);
  if (!uid) return [];

  return contactsForUid(uid);
}

async function contactsForUid(uid: string): Promise<ConsentedContact[]> {
  try {
    const snapshot = await adminDb()
      .collection("users")
      .doc(uid)
      .collection("contacts")
      .get();

    return snapshot.docs
      .map((doc) => ({
        // The id, not the field. They are written together and the id is the
        // one the rules pin, so it is the one to believe.
        channel: doc.id,
        value: typeof doc.get("value") === "string" ? doc.get("value") : "",
      }))
      .filter((contact) => contact.value.trim().length > 0);
  } catch (error) {
    console.error(`Could not read consent for ${uid}`, error);
    return [];
  }
}

/**
 * Whether an introduction to these registrations would reach anybody.
 *
 * The console needs this *before* the connect, not after. An email that says
 * "you have been matched" and carries no way to contact the other person is
 * worse than no email: it raises an expectation the product cannot meet, to
 * two people at once.
 */
export async function reachFor(
  registrationIds: string[],
): Promise<Record<string, Reach>> {
  const unique = [...new Set(registrationIds.filter((id) => id.trim()))];

  const entries = await Promise.all(
    unique.map(async (id): Promise<[string, Reach]> => {
      const uid = await resolveMemberUid(id, null);
      if (!uid) return [id, { hasAccount: false, channels: 0 }];

      const contacts = await contactsForUid(uid);
      return [id, { hasAccount: true, channels: contacts.length }];
    }),
  );

  return Object.fromEntries(entries);
}
