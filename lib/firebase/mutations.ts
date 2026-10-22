"use client";

import type { Person } from "@/types";

import { apiFetch } from "./api";

/**
 * Every write the console performs, in one place.
 *
 * These used to run in the browser against Firestore directly. They now post
 * to this project's own `/api/registry/mutate`, which checks the caller's
 * `admin` claim and performs the write with the Admin SDK. The document shapes
 * are unchanged, so existing records, the security rules and the downstream
 * mail worker all keep working — the only thing that moved is who writes.
 *
 * The admin's token is attached by `apiFetch`, which reads the signed-in user
 * straight from Firebase Auth, so this module stays free of React and can be
 * exercised without a provider.
 */

interface Body {
  action: string;
  [key: string]: unknown;
}

/** Posts one action and turns a failure into something worth showing a person. */
async function mutate(body: Body): Promise<{ mailto?: string }> {
  const response = await apiFetch("/api/registry/mutate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? `That did not save (${response.status}).`);
  }

  // Only `connect` returns anything — the draft the admin's mail client opens.
  return ((await response.json().catch(() => ({}))) ?? {}) as {
    mailto?: string;
  };
}

/** Flags a registration as mailed (or clears the flag). */
export async function setMailedStatus(
  personId: string,
  mailed: boolean,
): Promise<void> {
  await mutate({ action: "setMailed", personId, mailed });
}

/**
 * Marks a learner as connected to a tutor and stamps the tutor's contact
 * details onto the registration document.
 *
 * The mail draft used to be composed here and opened before the write, so it
 * was ready even if the write was slow. It is composed on the server now: it
 * names the tutor's contact details, and those live in a collection only the
 * Admin SDK may read. So the write happens first and the draft comes back
 * with it — a little slower, and the only way to avoid putting a number in
 * front of somebody that its owner never agreed to share.
 */
export async function connectPerson(
  learner: Person,
  tutor: Person,
): Promise<void> {
  const result = await mutate({
    action: "connect",
    learnerId: learner.id,
    tutor: {
      id: tutor.id,
      name: tutor.name,
      email: tutor.email || "",
      phone: tutor.phone || "",
      location: tutor.location || "",
    },
  });

  if (result.mailto && typeof window !== "undefined") {
    window.location.href = result.mailto;
  }
}

/** Returns a connected learner to the pending queue and clears the tutor link. */
export async function revertToPending(
  personId: string,
): Promise<void> {
  await mutate({ action: "revertToPending", personId });
}

/**
 * Queues the tutor and learner match notifications for the mail worker.
 *
 * Sends two ids. The payloads are built on the server, because they carry each
 * member's contact details and `users/{uid}/contacts` is owner-only — this
 * client is signed in as an admin, not as either member, so it cannot see what
 * would go in one.
 */
export async function queueMatchEmails(
  learnerId: string,
  tutorId: string,
): Promise<void> {
  await mutate({ action: "queueMail", learnerId, tutorId });
}

/** Permanently deletes a registration document. */
export async function removePerson(
  personId: string,
): Promise<void> {
  await mutate({ action: "remove", personId });
}
