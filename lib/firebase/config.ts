import type { FirebaseOptions } from "firebase/app";

/**
 * Firebase web configuration.
 *
 * These values are the same `slink-website` project the previous dashboard
 * used — they are intentionally checked in, exactly as before. Firebase web
 * API keys are public identifiers, not secrets; access is governed by
 * Firestore security rules. Each field can still be overridden per
 * environment through `NEXT_PUBLIC_*` variables.
 */
export const firebaseConfig: FirebaseOptions = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    "AIzaSyBHIWxAFZz9gBEJ12XXF6QK53sY5BEfrVs",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    "slink-website.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "slink-website",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    "slink-website.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "876458436291",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    "1:876458436291:web:0aff5515ed8b5fdc156476",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-KPQSCM484L",
};

/** Collection names. Unchanged from the previous dashboard. */
export const COLLECTIONS = {
  registrations: "registrations",
  submissions: "submissions",
  mailQueue: "mailQueue",
} as const;

/** From-address stamped on queued assessment and match emails. */
export const SENDER_EMAIL = "skillbank0@gmail.com";

/** Public learner-facing portal used in outbound email copy. */
export const PORTAL_URL = "https://slinkquest.vercel.app";
