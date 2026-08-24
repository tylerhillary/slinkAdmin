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

/** Flattens array-valued fields into a candidate list, ignoring non-arrays. */
export function spreadArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
