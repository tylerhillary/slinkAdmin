/**
 * Returns the first value that is neither `null` nor `undefined`.
 *
 * Mirrors a chain of `??` operators. This matters: several Firestore fields are
 * legitimately `false`, and `??` (unlike `||`) must preserve that.
 */
export function coalesce(candidates: readonly unknown[]): unknown {
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined) return candidate;
  }
  return undefined;
}

/** Raw Firestore document payload. */
export type DocData = Record<string, unknown>;

/**
 * The shape the adapters actually need from a document.
 *
 * A client-SDK `QueryDocumentSnapshot` satisfies this structurally, and so
 * does a document that arrived as JSON from this project's own server routes.
 * Typing the adapters against this rather than against the SDK is what lets
 * one set of field-name fallbacks serve both, instead of two copies that
 * drift apart the first time a historical spelling is added to one of them.
 */
export interface DocumentLike {
  readonly id: string;
  data(): DocData | undefined;
}

/** Flattens array-valued fields into a candidate list, ignoring non-arrays. */
export function spreadArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
