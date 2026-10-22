"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { adaptPerson } from "@/lib/adapters/person";
import { adaptSubmission } from "@/lib/adapters/submission";
import type { DocData, DocumentLike } from "@/lib/adapters/coalesce";
import { apiFetch } from "@/lib/firebase/api";
import type { MailerStatus, Person, RealtimeState, Submission } from "@/types";

/**
 * The dashboard's data, fetched from this project's own server.
 *
 * ## Why this is a poll and not a subscription
 *
 * It used to be `onSnapshot` straight onto `registrations`. That is a better
 * experience, and it is not available any more: the browser cannot read that
 * collection, because the documents hold full names, emails and phone numbers
 * and the rules rightly refuse. Reads happen on the server now, and a server
 * cannot push into a page over a plain fetch.
 *
 * Streaming it back over SSE was the alternative. It was not worth it: this
 * console runs on Vercel, where a long-lived response is capped by the
 * function's maximum duration, so the stream would drop and reconnect on a
 * timer anyway — a poll wearing a more complicated hat.
 *
 * What actually matters for a desk queue is that the screen is right when
 * somebody looks at it and right after they act. So: every [INTERVAL], on
 * returning to the tab, and immediately after any write.
 */

const INTERVAL = 15_000;

interface RegistryFeed {
  people: RealtimeState<Person[]>;
  submissions: RealtimeState<Submission[]>;
  /** Re-fetch now. Called after every write so the queue never lags a click. */
  refresh: () => Promise<void>;
  /** When the data on screen was last confirmed against the server. */
  fetchedAt: Date | null;
  /** Whether Connect sends mail itself or hands the desk drafts. Null until the first load. */
  mailer: MailerStatus | null;
}

interface Payload {
  registrations: { id: string; data: DocData }[];
  submissions: { id: string; data: DocData }[];
  fetchedAt: string;
  mailer?: MailerStatus;
}

/** Wraps a JSON document so the existing adapters can read it unchanged. */
function asDocument(row: { id: string; data: DocData }): DocumentLike {
  return { id: row.id, data: () => row.data };
}

export function useRegistryFeed(): RegistryFeed {

  const [people, setPeople] = useState<RealtimeState<Person[]>>({
    data: [],
    loading: true,
    error: null,
  });
  const [submissions, setSubmissions] = useState<RealtimeState<Submission[]>>({
    data: [],
    loading: true,
    error: null,
  });
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [mailer, setMailer] = useState<MailerStatus | null>(null);

  // Guards against two fetches overlapping — a poll landing while a
  // write-triggered refresh is still in flight would otherwise let the older
  // response win and briefly undo what the admin just did.
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;

    try {
      const response = await apiFetch("/api/registry", { cache: "no-store" });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }

      const payload = (await response.json()) as Payload;

      setPeople({
        data: payload.registrations.map((row) => adaptPerson(asDocument(row))),
        loading: false,
        error: null,
      });
      setSubmissions({
        data: payload.submissions.map((row) => adaptSubmission(asDocument(row))),
        loading: false,
        error: null,
      });
      setFetchedAt(new Date(payload.fetchedAt));
      setMailer(payload.mailer ?? null);
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      console.error("Registry fetch failed", error);
      // The last good data stays on screen. A queue that empties itself
      // because one request timed out is worse than a slightly stale one, and
      // the banner above it says which it is.
      setPeople((previous) => ({ ...previous, loading: false, error }));
      setSubmissions((previous) => ({ ...previous, loading: false, error }));
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), INTERVAL);

    // Coming back to the tab is the moment staleness is most likely and most
    // noticed, so it gets its own trigger rather than waiting out the timer.
    const onFocus = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [load]);

  return { people, submissions, refresh: load, fetchedAt, mailer };
}
