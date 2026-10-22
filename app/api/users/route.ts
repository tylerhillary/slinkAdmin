import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { errorResponse, requireAdmin } from "@/lib/server/guard";

/**
 * Member accounts — everyone who has signed in, however they signed in.
 *
 * Distinct from `registrations`, and the difference matters: a registration is
 * a *trade* somebody filed with the desk, and an account is a *person* who can
 * sign in. Somebody can have one without the other. A Google sign-in with no
 * registration yet is an account and no trade; a registration filed on the
 * website before accounts existed is a trade and no account.
 *
 * Two sources, joined on uid:
 *
 *  - `users/{uid}` in Firestore, written by the app and the site on first
 *    sign-in. Holds what the product knows.
 *  - Firebase Auth, which holds what the *identity provider* knows —
 *    which providers are linked, when they last signed in, whether the
 *    account is disabled, and the `admin` custom claim.
 *
 * Auth is the authority on the claim specifically. `users.role` is a
 * convenience the client writes and the rules pin to 'member'; console access
 * is the custom claim and nothing else. Reporting `role` as if it granted
 * anything would be describing a field that does not decide access.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Firebase returns at most 1000 per page; the desk is nowhere near that. */
const PAGE = 1000;

interface Row {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  providers: string[];
  isAdmin: boolean;
  disabled: boolean;
  createdAt: string | null;
  lastSignInAt: string | null;
  /** False when the account exists in Auth but has no `users` document yet. */
  hasRecord: boolean;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const [listed, stored] = await Promise.all([
      adminAuth().listUsers(PAGE),
      adminDb().collection("users").get(),
    ]);

    const records = new Map(stored.docs.map((doc) => [doc.id, doc.data()]));

    const rows: Row[] = listed.users.map((user) => {
      const record = records.get(user.uid);

      return {
        uid: user.uid,
        // The Firestore record can carry a name the provider did not give —
        // a member who typed theirs during registration — so it is the
        // fallback rather than being ignored.
        email: user.email ?? (record?.email as string) ?? null,
        displayName:
          user.displayName ?? ((record?.displayName as string) || null),
        photoUrl: user.photoURL ?? ((record?.photoUrl as string) || null),
        providers: user.providerData.map((p) => p.providerId),
        isAdmin: user.customClaims?.admin === true,
        disabled: user.disabled,
        createdAt: user.metadata.creationTime
          ? new Date(user.metadata.creationTime).toISOString()
          : null,
        lastSignInAt: user.metadata.lastSignInTime
          ? new Date(user.metadata.lastSignInTime).toISOString()
          : null,
        hasRecord: record !== undefined,
      };
    });

    // An orphaned `users` document — one whose Auth account has been deleted —
    // is worth surfacing rather than silently dropping: it is the shape of a
    // stale row somebody has to clean up.
    const orphans = stored.docs
      .filter((doc) => !listed.users.some((user) => user.uid === doc.id))
      .map((doc) => doc.id);

    rows.sort((a, b) => (b.lastSignInAt ?? "").localeCompare(a.lastSignInAt ?? ""));

    return NextResponse.json(
      {
        users: rows,
        orphanedRecords: orphans,
        truncated: listed.pageToken !== undefined,
        fetchedAt: new Date().toISOString(),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
