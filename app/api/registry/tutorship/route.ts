import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { tutorshipFor } from "@/lib/server/tutorship";
import { NotAllowed, errorResponse, requireAdmin } from "@/lib/server/guard";

/**
 * The safety record for one registration, and how it got that way.
 *
 * `tutorships/{matchId}` is readable by its two members and nobody else;
 * `venueAudit` is closed to every client. Both are readable with the Admin SDK
 * and nowhere else, so this console is the only place either can be seen — and
 * seeing it is the reason the venue is kept centrally at all. A record nobody
 * outside the pair can look at would not be a safety record.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body = (await request.json()) as { registrationId?: unknown };
    const id = body.registrationId;
    if (typeof id !== "string" || !id.trim()) {
      throw new NotAllowed(400, "Missing registrationId.");
    }

    const registration = await adminDb()
      .collection("registrations")
      .doc(id.trim())
      .get();

    return NextResponse.json(
      await tutorshipFor(id.trim(), registration.get("uid")),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
