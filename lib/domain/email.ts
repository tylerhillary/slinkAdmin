import { PORTAL_URL, SENDER_EMAIL } from "@/lib/firebase/config";
import type { Person } from "@/types";

import { firstName, formatPhoneNumber, properName } from "./format";
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
  phone: "Telephone",
  whatsapp: "WhatsApp",
  email: "Email address",
  telegram: "Telegram",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  other: "Other contact",
};

/** Channels whose value is a phone number, and so is shown in dialable form. */
const PHONE_CHANNELS = new Set(["phone", "whatsapp"]);

/**
 * What an introduction may say about a person, decided by how they joined.
 *
 * `app` — they have an account. Only the channels they chose there are passed
 * on, which may be none: that is their call, and it is respected, including
 * when the registration form holds a phone number they chose not to share.
 *
 * `registration` — they joined on the website and have never opened the app,
 * so there are no chosen channels to go by. Their introduction carries what
 * the desk decided an introduction needs (22 October 2026): full name, email
 * address, telephone number and state.
 *
 * The privacy policy at version 2026-09-05 describes the phone number as being
 * "so the desk can reach you about your match"; it needs to say that matches
 * receive it too.
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
      .map((contact) => {
        const value = contact.value.trim();
        const label = CHANNEL_LABELS[contact.channel] ?? "Contact";
        return `${label}: ${PHONE_CHANNELS.has(contact.channel) ? formatPhoneNumber(value) : value}`;
      });
  }

  const lines: string[] = [];
  if (person.email) lines.push(`Email address: ${person.email}`);
  if (person.phone) lines.push(`Telephone: ${formatPhoneNumber(person.phone)}`);
  return lines;
}

/** Whether the other side will be handed any way to contact this person. */
function isReachable(person: Person, reach: IntroductionReach): boolean {
  return sharedChannels(person, reach).length > 0;
}

/** The block describing one side of the match to the other. */
function detailsOf(person: Person, reach: IntroductionReach): string {
  const channels = sharedChannels(person, reach);
  const lines = [`Full name: ${properName(person.name)}`, ...channels];
  if (channels.length === 0) {
    lines.push("Contact details: to be provided by the Slink team");
  }
  if (person.location) lines.push(`Location: ${person.location}`);
  return lines.join("\n");
}

const SUPPORT_LINE =
  "Should you require any assistance, or if any of the information above is incorrect, please reply to this email and a member of our team will respond promptly.";

/** Included whenever a letter carries another person's contact details. */
const CONFIDENTIALITY_NOTICE =
  "Please note that the contact details in this letter are shared solely to enable you to arrange your sessions. Kindly keep them confidential and do not pass them on to anyone else.";

const SIGNATURE = [
  "Yours sincerely,",
  "",
  "The Slink Matching Team",
  `Email: ${SENDER_EMAIL}`,
  `Web: ${PORTAL_URL}`,
];

/**
 * The learner's and the tutor's introduction letters for a connection.
 *
 * Written as formal correspondence: a reference line, the match's details as
 * labelled fields, and a "Next steps" paragraph. Next steps only ask someone
 * to make contact when they have been given a way to — an instruction that
 * cannot be followed is worse than none — and otherwise say who will.
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

  const learnerName = properName(learner.name) || "Learner";
  const tutorName = properName(tutor.name) || "Tutor";
  const learnerReachable = isReachable(learner, learnerReach);
  const tutorReachable = isReachable(tutor, tutorReach);

  const learnerNextStep = tutorReachable
    ? "Kindly contact your tutor at your earliest convenience to introduce yourself and agree on a suitable time and place for your first session." +
      (learnerReachable ? " Your tutor has also been provided with your contact details." : "")
    : learnerReachable
      ? "Your tutor has been provided with your contact details and will contact you to arrange your first session."
      : "A member of the Slink team will contact you shortly to complete this introduction.";

  const tutorNextStep = learnerReachable
    ? "Kindly contact the learner at your earliest convenience to introduce yourself and agree on a suitable time and place for the first session." +
      (tutorReachable ? " The learner has also been provided with your contact details." : "")
    : tutorReachable
      ? "The learner has been provided with your contact details and will contact you to arrange the first session."
      : "A member of the Slink team will contact you shortly to complete this introduction.";

  const subjectSkill = skill ? ` – ${skill}` : "";

  const learnerText = [
    `Dear ${learnerName},`,
    "",
    "RE: CONFIRMATION OF YOUR TUTOR MATCH",
    "",
    `We are pleased to inform you that your registration with Slink has been reviewed and you have been matched with a tutor for ${skill || "your chosen skill"}.`,
    "",
    "The details of your tutor are as follows:",
    "",
    detailsOf(tutor, tutorReach),
    "",
    "Next steps",
    learnerNextStep,
    "",
    SUPPORT_LINE,
    ...(tutorReachable ? ["", CONFIDENTIALITY_NOTICE] : []),
    "",
    ...SIGNATURE,
  ].join("\n");

  const tutorText = [
    `Dear ${tutorName},`,
    "",
    "RE: NOTICE OF LEARNER ASSIGNMENT",
    "",
    `We are pleased to inform you that you have been assigned a learner who wishes to learn ${skill || "a skill you teach"}. Thank you for offering to share your expertise with the Slink community.`,
    "",
    "The details of your learner are as follows:",
    "",
    detailsOf(learner, learnerReach),
    "",
    "Next steps",
    tutorNextStep,
    "",
    SUPPORT_LINE,
    ...(learnerReachable ? ["", CONFIDENTIALITY_NOTICE] : []),
    "",
    ...SIGNATURE,
  ].join("\n");

  const metadata = {
    learnerId: learner.id,
    tutorId: tutor.id,
    overlappingSkills: overlapping,
  };

  return [
    {
      recipient: "learner",
      recipientId: learner.id,
      recipientName: firstName(learner.name),
      to: learner.email.trim(),
      subject: `Slink: Confirmation of Your Tutor Match${subjectSkill}`,
      text: learnerText,
      metadata: { type: "learnerMatch", ...metadata },
    },
    {
      recipient: "tutor",
      recipientId: tutor.id,
      recipientName: firstName(tutor.name),
      to: tutor.email.trim(),
      subject: `Slink: Notice of Learner Assignment${subjectSkill}`,
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
