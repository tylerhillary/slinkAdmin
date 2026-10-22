"use client";

import type { IntroductionDelivery, Person } from "@/types";

import { apiFetch } from "./api";

/**
 * Every write the console performs, in one place.
 *
 * These used to run in the browser against Firestore directly. They now post
 * to this project's own `/api/registry/mutate`, which checks the caller's
 * `admin` claim and performs the write with the Admin SDK. The document shapes
 * are unchanged, so existing records and the security rules keep working —
 * the only thing that moved is who writes.
 *
 * The admin's token is attached by `apiFetch`, which reads the signed-in user
 * straight from Firebase Auth, so this module stays free of React and can be
 * exercised without a provider.
 */

interface Body {
  action: string;
  [key: string]: unknown;
}

interface Result {
  /** Present for `connect` and `sendIntroduction`. */
  delivery?: IntroductionDelivery;
}

/** Posts one action and turns a failure into something worth showing a person. */
async function mutate(body: Body): Promise<Result> {
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

  return ((await response.json().catch(() => ({}))) ?? {}) as Result;
}

/** What the server reported, or an honest "nothing came back". */
function deliveryFrom(result: Result): IntroductionDelivery {
  return result.delivery ?? { mode: "draft", messages: [] };
}

/** Flags a registration as mailed (or clears the flag). */
export async function setMailedStatus(
  personId: string,
  mailed: boolean,
): Promise<void> {
  await mutate({ action: "setMailed", personId, mailed });
}

/**
 * Connects a learner to a tutor and announces it to both.
 *
 * One request does all of it: the write, the app stamps for members who have
 * an account, and the two introduction emails — sent from the desk's Gmail
 * when the server has an app password, returned as drafts when it does not.
 * The result says which, per person, so the console never has to guess.
 */
export async function connectPerson(
  learner: Person,
  tutor: Person,
): Promise<IntroductionDelivery> {
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
  return deliveryFrom(result);
}

/**
 * Sends the introduction for a learner's current connection.
 *
 * For connections made before the console could send mail, and for any whose
 * emails failed. The server always uses the tutor on record.
 */
export async function sendIntroduction(learnerId: string): Promise<IntroductionDelivery> {
  return deliveryFrom(await mutate({ action: "sendIntroduction", learnerId }));
}

/** Returns a connected learner to the pending queue and clears the tutor link. */
export async function revertToPending(
  personId: string,
): Promise<void> {
  await mutate({ action: "revertToPending", personId });
}

/** Permanently deletes a registration document. */
export async function removePerson(
  personId: string,
): Promise<void> {
  await mutate({ action: "remove", personId });
}
