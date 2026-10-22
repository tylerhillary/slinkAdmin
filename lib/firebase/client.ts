"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

import { firebaseConfig } from "./config";

/**
 * Browser-side Firebase singleton.
 *
 * Next.js Fast Refresh and React Strict Mode both re-execute module bodies, so
 * the app instance is looked up before being created.
 *
 * Note what is no longer here: Firestore. The console used to hold collection
 * references to `registrations`, `submissions` and `mailQueue` and read them
 * straight from the browser, which only worked while those collections were
 * readable by anyone on the internet. They are not, and should not be — the
 * documents hold full names, emails, phone numbers and ages.
 *
 * All data now goes through this project's own guarded API routes, which read
 * with the Admin SDK on the server. The only Firebase the browser still
 * touches is Auth, to prove who is asking, and Analytics.
 */
function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export const firebaseApp: FirebaseApp = getFirebaseApp();

/**
 * The browser's Auth instance — who is asking.
 *
 * A getter rather than a module-level constant: this module is also evaluated
 * while client components render on the server, and Auth has nothing to do
 * there. `getAuth` returns the same instance on every call.
 */
export function firebaseAuth(): Auth {
  return getAuth(firebaseApp);
}

/**
 * Analytics is optional: it fails in unsupported browsers and in any
 * non-window context, so it is loaded lazily and never allowed to throw.
 */
export async function initAnalytics(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    if (await isSupported()) {
      getAnalytics(firebaseApp);
    }
  } catch (error) {
    console.warn("Analytics not initialised", error);
  }
}
