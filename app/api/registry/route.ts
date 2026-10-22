import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { errorResponse, requireAdmin } from "@/lib/server/guard";
import { serialise } from "@/lib/server/serialise";

/**
 * Everything the dashboard renders, in one request.
 *
 * Two collections rather than two round trips: the console joins submissions
 * onto registrations to resolve skill-test results, and fetching them
 * separately would let the page render a moment where a person's test looks
 * missing because only half the data has landed.
 *
 * `force-dynamic` because this is live queue data. A cached copy of the desk's
 * work queue is worse than a slow one.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const db = adminDb();
    const [registrations, submissions] = await Promise.all([
      db.collection("registrations").get(),
      db.collection("submissions").get(),
    ]);

    return NextResponse.json(
      {
        registrations: registrations.docs.map(serialise),
        submissions: submissions.docs.map(serialise),
        fetchedAt: new Date().toISOString(),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
