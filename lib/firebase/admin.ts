import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Server-side Firebase, using the Admin SDK.
 *
 * The console used to read `registrations` straight from the browser, which
 * only worked because that collection was readable by anyone on the internet.
 * Closing that hole on 5 September 2026 was correct — the documents hold full
 * names, emails, phone numbers and ages — and it left the console blind.
 *
 * So reads and writes moved here. The browser never touches `registrations`
 * again; it asks this server, which checks who is asking before answering.
 * The Firestore rules stay exactly as they are, denying the browser outright,
 * which is the point: the rules are the guarantee, and nothing about the
 * console's convenience is allowed to weaken them.
 *
 * `server-only` at the top makes an accidental client import a build error
 * rather than a leaked service-account key.
 */

/** Reads the service-account key from whichever form the environment has. */
function credentialFromEnvironment() {
  // Vercel: a base64 blob, because the raw JSON's newlines do not survive
  // most environment-variable editors intact.
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (encoded) {
    const json = Buffer.from(encoded, "base64").toString("utf8");
    return cert(JSON.parse(json));
  }

  // Local development: the same GOOGLE_APPLICATION_CREDENTIALS path the
  // other tooling in this project already uses.
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) return cert(JSON.parse(raw));

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return undefined;

  throw new Error(
    "No Firebase service-account credential. Set FIREBASE_SERVICE_ACCOUNT_BASE64 " +
      "(deployed) or GOOGLE_APPLICATION_CREDENTIALS (local).",
  );
}

function adminApp(): App {
  if (getApps().length) return getApp();

  const credential = credentialFromEnvironment();
  return initializeApp(credential ? { credential } : {});
}

/** Firestore with rules bypassed. Only ever reached through a checked route. */
export function adminDb(): Firestore {
  return getFirestore(adminApp());
}

/** Used to verify the caller's ID token, never to mint one. */
export function adminAuth(): Auth {
  return getAuth(adminApp());
}
