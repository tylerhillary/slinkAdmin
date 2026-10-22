"use client";

import { apiFetch } from "./api";

/** Whether an introduction would actually reach somebody. */
export interface Reach {
  hasAccount: boolean;
  channels: number;
}

/**
 * Asks the server whether these people can be reached.
 *
 * Not a Firestore read, because there is nothing here the browser is allowed
 * to read: `users/{uid}/contacts` is owner-only, and this client is signed in
 * as an admin rather than as either member. The count comes back; the values
 * stay on the server.
 *
 * Never throws. A drawer that cannot answer this should fall silent rather
 * than block a desk from working — the warning it drives is advice, and the
 * introduction is still the admin's call.
 */
export async function fetchReach(
  ids: string[],
): Promise<Record<string, Reach>> {
  const wanted = ids.filter((id) => id.trim().length > 0);
  if (wanted.length === 0) return {};

  try {
    const response = await apiFetch("/api/registry/reach", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: wanted }),
    });
    if (!response.ok) return {};

    const payload = (await response.json()) as {
      reach?: Record<string, Reach>;
    };
    return payload.reach ?? {};
  } catch (error) {
    console.error("Could not check who is reachable", error);
    return {};
  }
}
