"use client";

import { addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { buildConnectionMailto, buildMatchNotifications } from "@/lib/domain/email";
import type { Person } from "@/types";

import { mailQueueRef, registrationsRef } from "./client";

/**
 * Every write the console performs, in one place.
 *
 * Field names and document shapes are identical to the previous dashboard so
 * existing documents, security rules and downstream mail workers keep working.
 */

/** Flags a registration as mailed (or clears the flag). */
export async function setMailedStatus(personId: string, mailed: boolean): Promise<void> {
  await updateDoc(doc(registrationsRef, personId), {
    mailed,
    mailedAt: mailed ? serverTimestamp() : null,
  });
}

/**
 * Marks a learner as connected to a tutor and stamps the tutor's contact
 * details onto the registration document.
 *
 * The admin's mail client is opened first — same as before — so the
 * announcement draft is ready even if the write is slow.
 */
export async function connectPerson(learner: Person, tutor: Person): Promise<void> {
  const mailtoHref = buildConnectionMailto(learner, tutor);
  if (mailtoHref && typeof window !== "undefined") {
    window.location.href = mailtoHref;
  }

  await updateDoc(doc(registrationsRef, learner.id), {
    status: "connected",
    connectedTutorId: tutor.id,
    connectedTutorName: tutor.name,
    connectedTutorEmail: tutor.email || "",
    connectedTutorPhone: tutor.phone || "",
    connectedTutorLocation: tutor.location || "",
    connectedAt: serverTimestamp(),
  });
}

/** Returns a connected learner to the pending queue and clears the tutor link. */
export async function revertToPending(personId: string): Promise<void> {
  await updateDoc(doc(registrationsRef, personId), {
    status: "pending",
    connectedTutorId: null,
    connectedTutorName: null,
    connectedTutorEmail: null,
    connectedTutorPhone: null,
    connectedTutorLocation: null,
    connectedAt: null,
    revertedAt: new Date(),
  });
}

/** Queues the tutor and learner match notifications for the mail worker. */
export async function queueMatchEmails(learner: Person, tutor: Person): Promise<void> {
  const payloads = buildMatchNotifications(learner, tutor);
  if (payloads.length === 0) return;

  await Promise.all(
    payloads.map((payload) =>
      addDoc(mailQueueRef, { ...payload, createdAt: serverTimestamp() }),
    ),
  );
}

/** Permanently deletes a registration document. */
export async function removePerson(personId: string): Promise<void> {
  await deleteDoc(doc(registrationsRef, personId));
}
