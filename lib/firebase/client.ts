"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { collection, getFirestore, type CollectionReference, type Firestore } from "firebase/firestore";

import { COLLECTIONS, firebaseConfig } from "./config";

/**
 * Browser-side Firebase singleton.
 *
 * Next.js Fast Refresh and React Strict Mode both re-execute module bodies, so
 * the app instance is looked up before being created.
 */
function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export const firebaseApp: FirebaseApp = getFirebaseApp();
export const db: Firestore = getFirestore(firebaseApp);

export const registrationsRef: CollectionReference = collection(
  db,
  COLLECTIONS.registrations,
);
export const submissionsRef: CollectionReference = collection(
  db,
  COLLECTIONS.submissions,
);
export const mailQueueRef: CollectionReference = collection(
  db,
  COLLECTIONS.mailQueue,
);

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
