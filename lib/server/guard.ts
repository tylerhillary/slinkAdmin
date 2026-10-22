import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { NextResponse } from "next/server";

import { adminAuth } from "@/lib/firebase/admin";

/**
 * Who is allowed to ask this server for member data.
 *
 * One check, used by every route: a valid Firebase ID token carrying the
 * `admin` custom claim. That is the same claim the Firestore rules name in
 * their catch-all, so there is one definition of "an administrator" across
 * the project rather than two that can drift apart.
 *
 * The claim is deliberately not inferred from an email address or a domain.
 * An allowlist in source is a list somebody forgets to update when a person
 * leaves; a custom claim is revoked in one place and takes effect on the
 * next token refresh.
 *
 * ## Why this lives in code and not only in Vercel
 *
 * For a while this check was removed in favour of Vercel Deployment
 * Protection. That left the console open: Standard Protection covers preview
 * and per-deployment URLs but not production domains, and on 22 October 2026
 * `slink-admin.vercel.app` served the console to a request with no login at
 * all. These routes read and write real people's names, phone numbers and
 * email addresses. Deployment Protection is a useful second layer; this check
 * is the guarantee. Do not remove it again.
 */

export interface Caller {
  uid: string;
  email: string | null;
}

/** Thrown by [requireAdmin]; carries the status the route should return. */
export class NotAllowed extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Firebase Auth rejections carry an `auth/…` code; anything else is ours. */
function isAuthRejection(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && code.startsWith("auth/");
}

/**
 * Resolves the caller, or throws [NotAllowed].
 *
 * 401 when there is no usable session, 403 when there is one without the
 * claim. The distinction is for the console's own UI: a 401 means "sign in",
 * a 403 means "this account will never get in, try another".
 */
export async function requireAdmin(request: Request): Promise<Caller> {
  // Resolved before the header is read, so a deployment missing its
  // service-account credential answers 500 to everybody rather than a
  // misleading 401 — a broken server should look broken.
  const auth = adminAuth();

  const header = request.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim();
  if (!token) {
    throw new NotAllowed(401, "Sign in to use the console.");
  }

  let decoded: DecodedIdToken;
  try {
    // `checkRevoked` so a disabled account or a revoked session stops working
    // now, not when the token would have expired on its own.
    decoded = await auth.verifyIdToken(token, true);
  } catch (error) {
    if (isAuthRejection(error)) {
      throw new NotAllowed(401, "Your session has expired. Sign in again.");
    }
    throw error;
  }

  if (decoded.admin !== true) {
    throw new NotAllowed(403, "This account does not have console access.");
  }

  return { uid: decoded.uid, email: decoded.email ?? null };
}

/** Turns a [NotAllowed] into its response, and anything else into a 500. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof NotAllowed) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("Console request failed", error);
  return NextResponse.json(
    { error: "Something went wrong at our end." },
    { status: 500 },
  );
}
