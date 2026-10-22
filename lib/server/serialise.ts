import "server-only";

import { Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";

import type { DocData } from "@/lib/adapters/coalesce";

/**
 * Firestore documents, flattened into something JSON can carry.
 *
 * The adapters in `lib/adapters/` accept anything with an `id` and a `data()`,
 * so a document that arrived over the wire runs through exactly the same
 * normalisation as one that came from the client SDK. That matters more than
 * it sounds: those adapters carry years of field-name fallbacks, and a second
 * copy of that logic for the server would drift within a month.
 */

export interface SerialisedDocument {
  id: string;
  data: DocData;
}

/**
 * Timestamps become ISO strings.
 *
 * `JSON.stringify` turns an Admin SDK `Timestamp` into `{_seconds, _nanoseconds}`,
 * which the adapters' date handling does not recognise — it would read as a
 * missing date and every row would lose its "registered on" label. An ISO
 * string is a shape they already accept.
 */
function plain(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(plain);

  if (value && typeof value === "object") {
    // A DocumentReference is not data the console renders, and serialising one
    // whole would drag the SDK's internals into the payload. Its path is the
    // only part worth keeping.
    const ref = value as { _path?: unknown; path?: unknown; firestore?: unknown };
    if (ref.firestore && typeof ref.path === "string") return ref.path;

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, plain(v)]),
    );
  }

  return value;
}

export function serialise(snapshot: DocumentSnapshot): SerialisedDocument {
  return {
    id: snapshot.id,
    data: plain(snapshot.data() ?? {}) as DocData,
  };
}
