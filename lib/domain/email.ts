import { PORTAL_URL, SENDER_EMAIL } from "@/lib/firebase/config";
import type { Person } from "@/types";

import { overlappingSkills } from "./matching";

/** Payload written to the `mailQueue` collection (minus the server timestamp). */
export interface MailQueuePayload {
  to: string;
  from: string;
  subject: string;
  message: { text: string };
  metadata: {
    type: "tutorMatch" | "learnerMatch";
    learnerId: string;
    tutorId: string;
    overlappingSkills: string[];
  };
  status: "queued";
}

function mailto(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

/** Assessment invitation sent to a registrant, keyed by their registration id. */
export function buildAssessmentMailto(person: Person): string {
  if (!person.email) return "";

  const safeName = person.name.trim() || "Candidate";
  const registrationCode = person.id || "0000";

  const body = [
    `Dear ${safeName},`,
    "",
    "Thank you for registering with Slink. We are pleased to have you move forward in our selection process.",
    "",
    "To better understand your skills and expertise, the next step is to complete a mandatory Professional Assessment. This test is designed to evaluate your proficiency and ensure a great fit for our current opportunities.",
    "",
    "Assessment Details",
    `Verification Code: ${registrationCode}`,
    "",
    `Access Link: ${PORTAL_URL}`,
    "",
    "Instructions for Completion",
    "Click the link above to access the secure testing portal.",
    `When prompted, enter your unique verification code: ${registrationCode}.`,
    "Ensure you are in a quiet environment with a stable internet connection before beginning.",
    "The assessment should take approximately [Number] minutes to complete.",
    "",
    "Please ensure you complete this step by [Date/Time] to keep your application active. If you encounter any technical difficulties, please reply to this email, and our support team will assist you.",
    "",
    "We look forward to reviewing your results.",
    "",
    "Best regards,",
    "",
    "The Slink Talent Team",
    `Slink – ${PORTAL_URL}`,
    `Email: ${SENDER_EMAIL}`,
  ].join("\n");

  return mailto(person.email, "Complete Your Professional Assessment", body);
}

/** Match announcement opened in the admin's mail client on connect. */
export function buildConnectionMailto(learner: Person, tutor: Person): string {
  if (!learner.email) return "";

  const body = [
    `Dear ${learner.name || "there"},`,
    "",
    "Great news! We have found a perfect match for your skill acquisition journey on Slink.",
    "",
    "Your Assigned Tutor Details:",
    `Name: ${tutor.name}`,
    `Email: ${tutor.email || "Not provided"}`,
    `Phone: ${tutor.phone || "Not provided"}`,
    "",
    "Please contact your tutor directly to begin your skill acquisition sessions. They are expecting your message!",
    "",
    "If you have any challenges or need further assistance, please feel free to get back to us by replying to this email.",
    "",
    "Best regards,",
    "The Slink Team",
    PORTAL_URL,
  ].join("\n");

  return mailto(learner.email, "We found a match for you! – Slink", body);
}

function contactBlock(person: Person): string {
  return [
    person.email ? `Email: ${person.email}` : null,
    person.phone ? `Phone: ${person.phone}` : null,
    person.location ? `Location: ${person.location}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

/**
 * Builds the queued notifications for a confirmed match — one for the tutor,
 * one for the learner. Recipients without an email address are skipped.
 */
export function buildMatchNotifications(
  learner: Person,
  tutor: Person,
): MailQueuePayload[] {
  const overlapping = overlappingSkills(learner, tutor);
  const skillSummary = overlapping.length
    ? overlapping.join(", ")
    : learner.learnSkills.join(", ");

  const safeLearnerName = learner.name || "Slink learner";
  const safeTutorName = tutor.name || "Slink tutor";

  const payloads: MailQueuePayload[] = [];

  if (tutor.email) {
    const tutorContact = contactBlock(learner);
    payloads.push({
      to: tutor.email,
      from: SENDER_EMAIL,
      subject: `New Slink learner match: ${safeLearnerName}`,
      message: {
        text: `Hi ${safeTutorName},\n\nYou have been matched with ${safeLearnerName} to teach ${
          skillSummary || "a new skill"
        }.\n\nLearner details:\n${
          tutorContact || "We will follow up with more details soon."
        }\n\nThank you for supporting the Slink community!`,
      },
      metadata: {
        type: "tutorMatch",
        learnerId: learner.id,
        tutorId: tutor.id,
        overlappingSkills: overlapping,
      },
      status: "queued",
    });
  }

  if (learner.email) {
    const learnerContact = contactBlock(tutor);
    payloads.push({
      to: learner.email,
      from: SENDER_EMAIL,
      subject: `Your Slink tutor match: ${safeTutorName}`,
      message: {
        text: `Hi ${safeLearnerName},\n\nGreat news! ${safeTutorName} is available to help you with ${
          skillSummary || "your goal"
        }.\n\nTutor details:\n${
          learnerContact || "We will follow up with contact details shortly."
        }\n\nKeep learning with Slink!`,
      },
      metadata: {
        type: "learnerMatch",
        learnerId: learner.id,
        tutorId: tutor.id,
        overlappingSkills: overlapping,
      },
      status: "queued",
    });
  }

  return payloads;
}
