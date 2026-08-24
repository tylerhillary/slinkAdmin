/** Value shapes `createdAt`-style fields have historically been stored as. */
export type DateLike =
  | string
  | number
  | Date
  | { toDate: () => Date }
  | null
  | undefined;

function hasToDate(value: object): value is { toDate: () => Date } {
  return typeof (value as { toDate?: unknown }).toDate === "function";
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const INTEGER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

/** Renders any supported timestamp shape as `4 December 2025`. Empty when unparseable. */
export function formatDateLabel(value: DateLike): string {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "string") {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) return value;
    return DATE_FORMATTER.format(new Date(timestamp));
  }

  const date =
    typeof value === "object" && hasToDate(value) ? value.toDate() : new Date(value);

  if (Number.isNaN(date.getTime())) return "";
  return DATE_FORMATTER.format(date);
}

/** Epoch milliseconds for sorting. `0` when the value cannot be resolved. */
export function toEpochMillis(value: DateLike): number {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "string") {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  const date =
    typeof value === "object" && hasToDate(value) ? value.toDate() : new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export function formatInteger(value: number | null | undefined): string {
  return INTEGER_FORMATTER.format(
    typeof value === "number" && Number.isFinite(value) ? value : 0,
  );
}

/** Skill-test scores render as integers when whole, otherwise to one decimal. */
export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Coerces a loosely typed Firestore value to a number.
 * Strings are stripped of anything that is not a digit, sign or decimal point,
 * which keeps values like `"8 / 10"` or `"score: 7"` usable.
 */
export function parseNumeric(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }
  if (typeof value === "string") {
    const cleaned = value.trim();
    if (!cleaned) return Number.NaN;
    const normalised = cleaned.replace(/[^0-9.+-]/g, "");
    if (!normalised) return Number.NaN;
    const parsed = Number.parseFloat(normalised);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
}

/** First finite number among the candidates, or `null`. */
export function firstFinite(candidates: readonly unknown[]): number | null {
  for (const candidate of candidates) {
    const parsed = parseNumeric(candidate);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** First explicit boolean among the candidates, or `null` when none were set. */
export function firstBoolean(candidates: readonly unknown[]): boolean | null {
  for (const candidate of candidates) {
    if (typeof candidate === "boolean") return candidate;
  }
  return null;
}

/** Lower-cased, de-duplicated, blank-free identifier set. */
export function toKeySet(candidates: readonly unknown[]): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const candidate of candidates) {
    if (typeof candidate === "string" || typeof candidate === "number") {
      const key = String(candidate).trim().toLowerCase();
      if (key) keys.add(key);
    }
  }
  return keys;
}

export function setsIntersect(
  a: ReadonlySet<string> | undefined,
  b: ReadonlySet<string> | undefined,
): boolean {
  if (!a || !b || a.size === 0 || b.size === 0) return false;
  for (const value of a) {
    if (b.has(value)) return true;
  }
  return false;
}

/** Two-letter monogram for avatar placeholders. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

/** Reads a string field, trimming and defaulting to `""`. */
export function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** First name, stripped of trailing punctuation ("Hilay, Owoidohoabasi" -> "Hilay"). */
export function firstName(name: string): string {
  const first = name.trim().split(/[\s,]+/).filter(Boolean)[0] ?? "";
  return first || name.trim() || "learner";
}
