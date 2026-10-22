import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

import { COMPANY_EMAIL } from "@/lib/firebase/config";

/**
 * Outgoing mail, sent as the desk's own Gmail account.
 *
 * ## Why Gmail and not a mail service
 *
 * The desk already works out of skillbank0@gmail.com: it is on the website,
 * in the privacy policy, and it is where members reply. Sending as that
 * account means introductions arrive from an address people recognise, land
 * in its Sent folder where the desk can see them, and bring replies home.
 * A service like Resend would need a domain the project does not own.
 *
 * ## How it is switched on
 *
 * `GMAIL_APP_PASSWORD` in the environment — a 16-character App Password
 * created on the company's own Google account, skillbank0@gmail.com
 * (2-Step Verification must be on to create one). Without it nothing is sent
 * and the console falls back to pre-filled Gmail drafts, so the desk is never
 * stuck.
 *
 * There is deliberately no setting to send as another account. Mail always
 * goes out as `COMPANY_EMAIL`, so a personal inbox can never become the
 * sender or quietly collect members' replies. An App Password made on any
 * other Google account is simply rejected by Gmail.
 *
 * ## What it deliberately does not do
 *
 * It never drains the `mailQueue` collection. That collection holds 68
 * introductions from February to October 2026 that were queued for a worker
 * that never existed; sending them now would introduce people to matches made
 * months ago, some since withdrawn. Mail goes out only for the connection the
 * desk is acting on, at the moment it acts.
 */

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
}

interface Credentials {
  user: string;
  pass: string;
}

function credentials(): Credentials | null {
  // Google displays App Passwords in four groups of four; people paste the
  // spaces along with them.
  const pass = (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, "");
  if (!pass) return null;

  return { user: COMPANY_EMAIL, pass };
}

/** Whether the server can send on its own. */
export function mailerConfigured(): boolean {
  return credentials() !== null;
}

/** The address mail goes out as: always the company address. */
export function senderAddress(): string {
  return COMPANY_EMAIL;
}

let cached: { key: string; transport: Transporter } | null = null;

function transporter(creds: Credentials): Transporter {
  const key = `${creds.user}:${creds.pass}`;
  if (cached?.key === key) return cached.transport;

  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: creds.user, pass: creds.pass },
  });
  cached = { key, transport };
  return transport;
}

/** Thrown when sending fails; the message is written for the desk, not a developer. */
export class MailError extends Error {}

/** Turns an SMTP failure into a sentence the desk can act on. */
export function describeMailError(error: unknown): string {
  const { code, responseCode, message } = (error ?? {}) as {
    code?: unknown;
    responseCode?: unknown;
    message?: unknown;
  };

  if (code === "EAUTH" || responseCode === 535) {
    return "Gmail rejected the app password. Check GMAIL_APP_PASSWORD in Vercel.";
  }
  if (code === "ECONNECTION" || code === "ETIMEDOUT" || code === "ESOCKET") {
    return "Could not reach Gmail. Try again in a moment.";
  }
  if (responseCode === 550 || responseCode === 553) {
    return "Gmail refused the recipient address.";
  }
  if (responseCode === 421 || responseCode === 454) {
    return "Gmail is limiting sends from this account right now. Try again later.";
  }

  const text = typeof message === "string" ? message : "Unknown error.";
  return `Gmail did not accept the email: ${text.slice(0, 160)}`;
}

/** Sends one message. Resolves to Gmail's message id; throws [MailError]. */
export async function sendMail(mail: OutgoingMail): Promise<string> {
  const creds = credentials();
  if (!creds) {
    throw new MailError("Sending is not set up: GMAIL_APP_PASSWORD is missing.");
  }

  try {
    const info = await transporter(creds).sendMail({
      from: { name: "Slink", address: creds.user },
      replyTo: creds.user,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
    });
    return info.messageId;
  } catch (error) {
    throw new MailError(describeMailError(error));
  }
}
