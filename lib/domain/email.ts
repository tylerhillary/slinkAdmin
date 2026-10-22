import { PORTAL_URL, SENDER_EMAIL } from "@/lib/firebase/config";
import type { Person } from "@/types";

import { firstName } from "./format";
import { overlappingSkills } from "./matching";

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

/**
 * One way to be reached that a member has agreed may be passed on.
 *
 * Structural, not imported from `lib/server/accounts` — this module is shared
 * with the browser bundle and that one is `server-only`. The shapes have to
 * stay in step; `tsc` catches it if they drift, because the server passes one
 * straight into the other.
 */
export interface ConsentedContact {
  channel: string;
  value: string;
}

const CHANNEL_LABELS: Record<string, string> = {
  phone: "Phone",
  whatsapp: "WhatsApp",
  email: "Email",
  telegram: "Telegram",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  other: "Also",
};

/**
 * What an introduction may say about a person, decided by how they joined.
 *
 * `app` — they have an account. Only the channels they chose there are passed
 * on, which may be none: that is their call, and it is respected.
 *
 * `registration` — they joined on the website and have never opened the app,
 * so there are no chosen channels to go by. Their introduction carries their
 * first name, email address and state: the desk's decision of 22 October 2026
 * on what an introduction needs. Phone numbers stay with the desk, as the
 * privacy policy says ("so the desk can reach you about your match").
 */
export type IntroductionReach =
  | { kind: "app"; contacts: ConsentedContact[] }
  | { kind: "registration" };

/** One of the two emails that announce a connection. */
export interface IntroductionEmail {
  recipient: "learner" | "tutor";
  recipientId: string;
  /** First name, for the console's own display. */
  recipientName: string;
  /** Empty when the recipient has no email on file — they cannot be sent one. */
  to: string;
  subject: string;
  text: string;
  metadata: {
    type: "learnerMatch" | "tutorMatch";
    learnerId: string;
    tutorId: string;
    overlappingSkills: string[];
  };
}

function sharedChannels(person: Person, reach: IntroductionReach): string[] {
  if (reach.kind === "app") {
    return reach.contacts
      .filter((contact) => contact.value.trim().length > 0)
      .map(
        (contact) =>
          `${CHANNEL_LABELS[contact.channel] ?? "Contact"}: ${contact.value.trim()}`,
      );
  }
  return person.email ? [`Email: ${person.email}`] : [];
}

/** Whether the other side will be handed any way to contact this person. */
function isReachable(person: Person, reach: IntroductionReach): boolean {
  return sharedChannels(person, reach).length > 0;
}

/** The block describing one side of the match to the other. */
function detailsOf(person: Person, reach: IntroductionReach): string {
  const lines = [`Name: ${firstName(person.name)}`, ...sharedChannels(person, reach)];
  if (person.location) lines.push(`Location: ${person.location}`);
  return lines.join("\n");
}

/**
 * The learner's and the tutor's introduction emails for a connection.
 *
 * Each tells the recipient who they have been matched with and how to reach
 * them. Neither tells anyone to "get in touch" when the other side shared
 * nothing — an instruction that cannot be followed is worse than none, so the
 * copy says the desk will put them in touch instead.
 */
export function buildIntroductions(
  learner: Person,
  tutor: Person,
  learnerReach: IntroductionReach,
  tutorReach: IntroductionReach,
): IntroductionEmail[] {
  const overlapping = overlappingSkills(learner, tutor);
  const skill = overlapping.length
    ? overlapping.join(", ")
    : learner.learnSkills.join(", ");

  const learnerFirst = firstName(learner.name);
  const tutorFirst = firstName(tutor.name);
  const learnerReachable = isReachable(learner, learnerReach);
  const tutorReachable = isReachable(tutor, tutorReach);

  // Who can make the first move depends on whose details were handed over,
  // so each closing line names the move that is actually possible.
  const learnerClosing = tutorReachable
    ? `Please reach out to ${tutorFirst} to arrange your first session — they are expecting to hear from you.`
    : learnerReachable
      ? `${tutorFirst} has your details and will be in touch to arrange your first session.`
      : `We will put you in touch with ${tutorFirst} shortly.`;

  const tutorClosing = tutorReachable && learnerReachable
    ? `${learnerFirst} has your details too and will be in touch to arrange a first session. Feel free to reach out first.`
    : tutorReachable
      ? `${learnerFirst} has your details and will be in touch to arrange a first session.`
      : learnerReachable
        ? `Please reach out to ${learnerFirst} to arrange a first session.`
        : `We will put you in touch with ${learnerFirst} shortly.`;

  const metadata = {
    learnerId: learner.id,
    tutorId: tutor.id,
    overlappingSkills: overlapping,
  };

  const learnerText = [
    `Hi ${learnerFirst},`,
    "",
    `Great news! We have matched you with ${tutorFirst}, who can help you with ${skill || "your chosen skill"}.`,
    "",
    "Your tutor:",
    detailsOf(tutor, tutorReach),
    "",
    learnerClosing,
    "",
    "If you have any questions or run into any difficulty, just reply to this email.",
    "",
    "Best regards,",
    "The Slink Team",
    PORTAL_URL,
  ].join("\n");

  const tutorText = [
    `Hi ${tutorFirst},`,
    "",
    `You have been matched with ${learnerFirst}, who would like to learn ${skill || "a skill you teach"}.`,
    "",
    "Your learner:",
    detailsOf(learner, learnerReach),
    "",
    tutorClosing,
    "",
    "Thank you for sharing your skills with the Slink community. If anything comes up, just reply to this email.",
    "",
    "Best regards,",
    "The Slink Team",
    PORTAL_URL,
  ].join("\n");

  return [
    {
      recipient: "learner",
      recipientId: learner.id,
      recipientName: learnerFirst,
      to: learner.email.trim(),
      subject: `Your Slink tutor match: ${tutorFirst}`,
      text: learnerText,
      metadata: { type: "learnerMatch", ...metadata },
    },
    {
      recipient: "tutor",
      recipientId: tutor.id,
      recipientName: tutorFirst,
      to: tutor.email.trim(),
      subject: `New Slink learner match: ${learnerFirst}`,
      text: tutorText,
      metadata: { type: "tutorMatch", ...metadata },
    },
  ];
}

/**
 * A Gmail compose window, pre-filled and signed in as the desk's account.
 *
 * Used when the server cannot send on its own yet, and as the fallback for a
 * send that failed: one click opens the finished email, a second sends it.
 * `encodeURIComponent` rather than `URLSearchParams`, which would turn spaces
 * into `+` signs in the body.
 */
export function gmailComposeUrl(
  from: string,
  to: string,
  subject: string,
  body: string,
): string {
  const params: Record<string, string> = {
    authuser: from,
    view: "cm",
    fs: "1",
    to,
    su: subject,
    body,
  };
  const query = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  return `https://mail.google.com/mail/?${query}`;
}
