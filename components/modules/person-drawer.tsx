"use client";

import {
  BadgeCheck,
  CalendarDays,
  FileText,
  Link2,
  Mail,
  MapPin,
  Phone,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { TutorMatchList } from "@/components/modules/tutor-match-list";
import { useRegistry } from "@/components/providers/registry-provider";
import { Badge, SkillChip, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { buildAssessmentMailto } from "@/lib/domain/email";
import { firstName, formatScore } from "@/lib/domain/format";
import { getTutorMatches } from "@/lib/domain/matching";
import type { Person } from "@/types";

/**
 * Record detail panel.
 *
 * Owns tutor selection locally; every write is delegated to the registry
 * provider so the mutation path stays identical to the rest of the console.
 */
export function PersonDrawer() {
  const { selectedPerson, selectPerson, people, connectToTutor, setConnected, requestRemoval } =
    useRegistry();

  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [reverting, setReverting] = useState(false);

  const matches = useMemo(
    () => (selectedPerson ? getTutorMatches(selectedPerson, people) : []),
    [selectedPerson, people],
  );

  // The already-connected tutor is pre-selected when the panel opens.
  useEffect(() => {
    if (!selectedPerson) {
      setSelectedTutorId(null);
      return;
    }
    setSelectedTutorId(
      selectedPerson.status === "connected" && selectedPerson.connectedTutorId
        ? selectedPerson.connectedTutorId
        : null,
    );
    setConnecting(false);
    setReverting(false);
  }, [selectedPerson]);

  if (!selectedPerson) return null;

  const person = selectedPerson;
  const isConnected = person.status === "connected";

  const selectedTutor =
    people.find((candidate) => candidate.id === selectedTutorId) ??
    (isConnected && person.connectedTutorId
      ? ({
          id: person.connectedTutorId,
          name: person.connectedTutorName || "Assigned tutor",
          email: person.connectedTutorEmail,
          phone: person.connectedTutorPhone,
          location: person.connectedTutorLocation,
        } as Pick<Person, "id" | "name" | "email" | "phone" | "location">)
      : null);

  const connectTarget = people.find((candidate) => candidate.id === selectedTutorId) ?? null;
  const assessmentMailto = buildAssessmentMailto(person);
  const testScore = formatScore(person.skillTest.score ?? person.skillTest.rating);

  const handleConnect = async (): Promise<void> => {
    if (!connectTarget) return;
    setConnecting(true);
    try {
      await connectToTutor(person, connectTarget);
      selectPerson(null);
    } catch {
      // The provider already surfaced a toast; keep the panel open to retry.
      setConnecting(false);
    }
  };

  const handleRevert = async (): Promise<void> => {
    setReverting(true);
    await setConnected(person, false);
    setReverting(false);
    selectPerson(null);
  };

  return (
    <Drawer
      open
      onClose={() => selectPerson(null)}
      label={`Record for ${person.name}`}
      header={
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={person.status} />
            {person.isProfessional ? (
              <Badge tone="accent">
                <BadgeCheck className="h-3 w-3" aria-hidden />
                Professional
              </Badge>
            ) : null}
            {person.flags.mailed ? (
              <Badge tone="info">
                <Mail className="h-3 w-3" aria-hidden />
                Mailed
              </Badge>
            ) : null}
          </div>

          <h2 className="truncate text-xl font-semibold text-content">{person.name}</h2>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-muted">
            {person.email ? (
              <a
                href={assessmentMailto || `mailto:${person.email}`}
                className="flex items-center gap-1.5 underline decoration-dotted underline-offset-2 transition-colors duration-150 hover:text-content"
                title="Send the professional assessment invitation"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{person.email}</span>
              </a>
            ) : null}
            {person.phone ? (
              <a
                href={`tel:${person.phone}`}
                className="flex items-center gap-1.5 transition-colors duration-150 hover:text-content"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {person.phone}
              </a>
            ) : null}
            {person.location ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {person.location}
              </span>
            ) : null}
            {person.createdAtLabel ? (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {person.createdAtLabel}
              </span>
            ) : null}
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="primary"
            size="lg"
            className="flex-1 justify-center"
            disabled={!connectTarget || connecting}
            loading={connecting}
            onClick={() => void handleConnect()}
            leading={<Link2 className="h-4 w-4" aria-hidden />}
          >
            {connecting
              ? "Connecting…"
              : connectTarget
                ? `Connect to ${firstName(connectTarget.name)}`
                : "Select a tutor to connect"}
          </Button>

          {isConnected ? (
            <Button
              variant="secondary"
              size="lg"
              className="justify-center"
              disabled={reverting}
              loading={reverting}
              onClick={() => void handleRevert()}
              leading={<Undo2 className="h-4 w-4" aria-hidden />}
            >
              Revert to pending
            </Button>
          ) : (
            <Button
              variant="danger-soft"
              size="lg"
              className="justify-center"
              onClick={() => requestRemoval(person)}
              leading={<Trash2 className="h-4 w-4" aria-hidden />}
            >
              Delete
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-7">
        <Section title="Profile">
          <dl className="divide-y divide-line rounded-lg border border-line">
            <Row label="Email">
              {person.email ? (
                <a
                  href={assessmentMailto || `mailto:${person.email}`}
                  className="break-all underline decoration-dotted underline-offset-2 hover:text-content"
                >
                  {person.email}
                </a>
              ) : (
                <Muted />
              )}
            </Row>
            <Row label="Phone">
              {person.phone ? (
                <a href={`tel:${person.phone}`} className="hover:text-content">
                  {person.phone}
                </a>
              ) : (
                <Muted />
              )}
            </Row>
            <Row label="Registration ID">
              <code className="break-all rounded bg-surface-subtle px-1.5 py-0.5 font-mono text-2xs">
                {person.id}
              </code>
            </Row>
            <Row label="Skill test">
              {person.skillTest.taken ? (
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone={person.skillTest.ready ? "success" : "warning"}>
                    {person.skillTest.ready ? "Ready to teach" : "Completed"}
                  </Badge>
                  {testScore ? (
                    <span className="tabular text-xs text-content-muted">
                      Score {testScore}
                    </span>
                  ) : null}
                </span>
              ) : (
                <span className="text-content-subtle">Test not taken</span>
              )}
            </Row>
            <Row label="Resume">
              {person.resume.url ? (
                <a
                  href={person.resume.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 underline decoration-dotted underline-offset-2 hover:text-content"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  View resume
                </a>
              ) : person.resume.submitted ? (
                <span className="text-content-muted">Submitted</span>
              ) : (
                <span className="text-content-subtle">Not submitted</span>
              )}
              {person.resume.updatedAtLabel ? (
                <span className="mt-1 block text-2xs text-content-subtle">
                  Updated {person.resume.updatedAtLabel}
                </span>
              ) : null}
            </Row>
            <Row label="Professional">
              {person.isProfessional ? "Professional profile" : "Not flagged"}
            </Row>
            <Row label="Location">{person.location || <Muted />}</Row>
            <Row label="Source">{person.source || <Muted />}</Row>
            <Row label="Consent">
              {person.consent === null ? "Unknown" : person.consent ? "Granted" : "Revoked"}
            </Row>
          </dl>
        </Section>

        <Section title="Skills to learn">
          <div className="flex flex-wrap gap-1.5">
            {person.learnSkills.length > 0 ? (
              person.learnSkills.map((skill) => (
                <SkillChip key={skill} kind="learn">
                  {skill}
                </SkillChip>
              ))
            ) : (
              <p className="text-xs text-content-subtle">No learning goals recorded.</p>
            )}
          </div>
        </Section>

        <Section title="Skills to teach">
          <div className="flex flex-wrap gap-1.5">
            {person.teachSkills.length > 0 ? (
              person.teachSkills.map((skill) => (
                <SkillChip key={skill} kind="teach">
                  {skill}
                </SkillChip>
              ))
            ) : (
              <p className="text-xs text-content-subtle">No teaching skills supplied.</p>
            )}
          </div>
        </Section>

        <Section
          title="Suggested tutors"
          trailing={
            <span className="tabular text-2xs text-content-subtle">
              {matches.length > 0
                ? `${matches.length} match${matches.length > 1 ? "es" : ""}`
                : "No matches yet"}
            </span>
          }
        >
          <TutorMatchList
            matches={matches}
            selectedTutorId={selectedTutorId}
            onSelect={setSelectedTutorId}
          />
        </Section>

        {selectedTutor ? (
          <Section title="Selected tutor">
            <div className="rounded-lg border border-accent/35 bg-accent-soft p-3">
              <p className="text-sm font-medium text-content">{selectedTutor.name}</p>
              <dl className="mt-2.5 space-y-1.5 text-xs">
                <MiniRow label="Email">{selectedTutor.email || "No email on file"}</MiniRow>
                <MiniRow label="Phone">{selectedTutor.phone || "No phone on file"}</MiniRow>
                <MiniRow label="Location">
                  {selectedTutor.location || "No location on file"}
                </MiniRow>
              </dl>
              <p className="mt-3 flex items-start gap-1.5 text-2xs text-content-muted">
                <Send className="mt-px h-3 w-3 shrink-0" aria-hidden />
                {isConnected && selectedTutor.id === person.connectedTutorId
                  ? person.connectedAtLabel
                    ? `Connected on ${person.connectedAtLabel}.`
                    : "This learner is currently connected to this tutor."
                  : "Connecting opens the announcement email and queues notifications for both parties."}
              </p>
            </div>
          </Section>
        ) : null}
      </div>
    </Drawer>
  );
}

function Section({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="text-2xs font-semibold uppercase tracking-widest text-content-subtle">
          {title}
        </h3>
        {trailing}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <dt className="w-28 shrink-0 text-xs text-content-subtle">{label}</dt>
      <dd className="min-w-0 flex-1 text-xs text-content-muted">{children}</dd>
    </div>
  );
}

function MiniRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="w-14 shrink-0 text-content-subtle">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-content-muted">{children}</dd>
    </div>
  );
}

function Muted() {
  return <span className="text-content-subtle">—</span>;
}
