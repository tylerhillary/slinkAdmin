"use client";

import { firebaseAuth } from "./client";

/**
 * `fetch` for this project's own API routes, carrying the signed-in admin's
 * Firebase ID token.
 *
 * Every route checks that token for the `admin` claim (`lib/server/guard.ts`),
 * so every call to `/api/*` goes through here. `getIdToken()` hands back the
 * cached token and only refreshes it when it is close to expiry, so asking
 * per request costs nothing in the common case.
 *
 * Throws when nobody is signed in. The dashboard only mounts behind the
 * sign-in gate, so reaching that branch means a session ended mid-flight —
 * worth surfacing, not papering over.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const user = firebaseAuth().currentUser;
  if (!user) {
    throw new Error("You have been signed out. Sign in again to continue.");
  }

  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${await user.getIdToken()}`);

  return fetch(path, { ...init, headers });
}
