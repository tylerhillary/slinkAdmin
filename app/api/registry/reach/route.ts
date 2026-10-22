import { NextResponse } from "next/server";

import { reachFor } from "@/lib/server/accounts";
import { NotAllowed, errorResponse, requireAdmin } from "@/lib/server/guard";

/**
 * Whether an introduction to these people would actually reach them.
 *
 * ## Why this is a route and not a field on the registry
 *
 * The answer depends on `users/{uid}/contacts`, whose rules are `allow read:
 * if isOwner(uid)`. The console is signed in as an admin, not as either
 * member, so its browser client cannot read that collection — not filtered,
 * not partially, not at all. Only the Admin SDK can, which puts the question
 * on the server.
 *
 * It reports a count rather than the values. The desk needs to know whether
 * somebody can be reached before it introduces them; it does not need their
 * WhatsApp number on a screen to decide that, and the fewer places those
 * values are rendered the better.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body = (await request.json()) as { ids?: unknown };
    if (!Array.isArray(body.ids)) {
      throw new NotAllowed(400, "Missing ids.");
    }

    const ids = body.ids.filter(
      (id): id is string => typeof id === "string" && id.trim().length > 0,
    );
    // A pair at a time from the drawer. The cap is here so a malformed caller
    // cannot turn one request into a full scan of the member table.
    if (ids.length > 25) {
      throw new NotAllowed(400, "Too many ids in one request.");
    }

    return NextResponse.json({ reach: await reachFor(ids) });
  } catch (error) {
    return errorResponse(error);
  }
}
