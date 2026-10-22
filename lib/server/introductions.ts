import "server-only";

import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";

import { adaptPerson } from "@/lib/adapters/person";
import { buildIntroductions, gmailComposeUrl, type IntroductionEmail } from "@/lib/domain/email";
import { adminDb } from "@/lib/firebase/admin";
import type {
  IntroductionDelivery,
  IntroductionMessage,
  IntroductionStatus,
} from "@/types";

import { introductionReach } from "./accounts";
import { MailError, mailerConfigured, sendMail, senderAddress } from "./mailer";

interface LogEntry {
  email: IntroductionEmail;
  status: "sent" | "failed" | "draft";
  messageId?: string;
  error?: string;
}

function overallStatus(
  messages: IntroductionMessage[],
  automatic: boolean,
): IntroductionStatus {
  if (!automatic) return "draft";

  const deliverable = messages.filter((message) => message.status !== "no-email");
  const sent = deliverable.filter((message) => message.status === "sent").length;

  if (deliverable.length > 0 && sent === deliverable.length) return "sent";
  return sent > 0 ? "partial" : "failed";
}

/**
 * Announces a connection to both people in it.
 *
 * With an app password configured, both emails go out from the desk's Gmail
 * now. Without one, nothing is sent and the desk gets two finished Gmail
 * drafts instead. Either way the outcome is recorded twice:
 *
 * - on the learner's registration, as `introduction` — what the console shows,
 *   and what tells the desk which connections were never announced;
 * - in `mailLog`, one document per email — the record of what each person was
 *   told and whether it reached them.
 *
 * Not `mailQueue`. That collection is shaped like a send request, and the
 * Firebase "Trigger Email" extension sends every new document in the
 * collection it watches. Writing finished sends there would mean that if the
 * extension were ever installed on it, every introduction went out twice.
 */
export async function deliverIntroduction(
  learnerDoc: DocumentSnapshot,
  tutorDoc: DocumentSnapshot,
): Promise<IntroductionDelivery> {
  const learner = adaptPerson(learnerDoc);
  const tutor = adaptPerson(tutorDoc);

  const [learnerReach, tutorReach] = await Promise.all([
    introductionReach(learner.id, learnerDoc.get("uid")),
    introductionReach(tutor.id, tutorDoc.get("uid")),
  ]);

  const emails = buildIntroductions(learner, tutor, learnerReach, tutorReach);
  const automatic = mailerConfigured();
  const from = senderAddress();

  const messages: IntroductionMessage[] = [];
  const log: LogEntry[] = [];

  // One at a time: two emails is no load, and a failed login on the first
  // tells us the second will fail for the same reason.
  for (const email of emails) {
    const base = { recipient: email.recipient, name: email.recipientName, to: email.to };

    if (!email.to) {
      messages.push({ ...base, status: "no-email" });
      continue;
    }

    const composeUrl = gmailComposeUrl(from, email.to, email.subject, email.text);

    if (!automatic) {
      messages.push({ ...base, status: "draft", composeUrl });
      log.push({ email, status: "draft" });
      continue;
    }

    try {
      const messageId = await sendMail({
        to: email.to,
        subject: email.subject,
        text: email.text,
      });
      messages.push({ ...base, status: "sent" });
      log.push({ email, status: "sent", messageId });
    } catch (error) {
      const reason = error instanceof MailError ? error.message : "Could not send.";
      console.error(`Introduction to ${email.recipient} ${email.recipientId} failed`, error);
      // The draft travels with the failure, so the desk can still send it by hand.
      messages.push({ ...base, status: "failed", error: reason, composeUrl });
      log.push({ email, status: "failed", error: reason });
    }
  }

  const status = overallStatus(messages, automatic);

  // Recording comes after sending and must not undo it. If this write fails
  // the emails have still gone; reporting the request as failed would invite
  // the desk to send them again.
  try {
    const db = adminDb();
    const batch = db.batch();
    const mailLog = db.collection("mailLog");

    for (const entry of log) {
      batch.set(mailLog.doc(), {
        to: entry.email.to,
        from,
        subject: entry.email.subject,
        text: entry.email.text,
        metadata: entry.email.metadata,
        status: entry.status,
        channel: automatic ? "gmail" : "gmail-draft",
        createdAt: FieldValue.serverTimestamp(),
        ...(entry.status === "sent"
          ? { sentAt: FieldValue.serverTimestamp(), messageId: entry.messageId ?? null }
          : {}),
        ...(entry.error ? { error: entry.error } : {}),
      });
    }

    batch.update(learnerDoc.ref, {
      introduction: {
        status,
        tutorId: tutor.id,
        at: FieldValue.serverTimestamp(),
      },
    });

    await batch.commit();
  } catch (error) {
    console.error(`Could not record the introduction for ${learner.id}`, error);
  }

  return { mode: automatic ? "sent" : "draft", messages };
}
