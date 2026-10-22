"use client";

import { apiFetch } from "./api";

export interface VenueRecord {
  matchId: string;
  mode: string;
  status: string;
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
  confirmedBy: string;
}

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

const EMPTY: TutorshipView = { venue: null, audit: [] };

/**
 * Asks the server where a tutorship is happening, and what it took to get
 * there.
 *
 * Not a Firestore read: `tutorships` refuses this client because it is not one
 * of the two members, and `venueAudit` refuses every client there is.
 *
 * Never throws. A drawer that cannot answer should show nothing rather than
 * break a desk's ability to work.
 */
export async function fetchTutorship(
  registrationId: string,
): Promise<TutorshipView> {
  if (!registrationId.trim()) return EMPTY;

  try {
    const response = await apiFetch("/api/registry/tutorship", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ registrationId }),
    });
    if (!response.ok) return EMPTY;

    return (await response.json()) as TutorshipView;
  } catch (error) {
    console.error("Could not read the tutorship", error);
    return EMPTY;
  }
}
