import type { Person } from "@/types";

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value).replace(/"/g, '""');
  return /[",\n\r]/.test(text) ? `"${text}"` : text;
}

const HEADER = [
  "Name",
  "Email",
  "Phone",
  "Location",
  "Status",
  "Registered",
  "Teach Skills",
  "Learn Skills",
  "Source",
  "Skill Test Score",
  "Skill Test Status",
] as const;

/** Serialises the current queue view to CSV. */
export function buildPeopleCsv(people: readonly Person[]): string {
  const rows = people.map((person) =>
    [
      person.name,
      person.email,
      person.phone,
      person.location,
      person.status,
      person.createdAtLabel,
      person.teachSkills.join("; "),
      person.learnSkills.join("; "),
      person.source,
      person.skillTest.score ?? person.skillTest.rating ?? "",
      person.skillTest.taken ? "Completed" : "Not taken",
    ]
      .map(escapeCsv)
      .join(","),
  );

  return [HEADER.join(","), ...rows].join("\r\n");
}

/** Triggers a client-side download of the given CSV payload. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
