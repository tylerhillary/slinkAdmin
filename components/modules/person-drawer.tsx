"use client";

import {
  BadgeCheck,
  CalendarDays,
  FileText,
  AlertTriangle,
  History,
  Link2,
  Mail,
  MapPin,
  ShieldCheck,
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
import { fetchReach, type Reach } from "@/lib/firebase/reach";
import {
  fetchTutorship,
  type TutorshipView,
} from "@/lib/firebase/tutorship";
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

  /**
   * Whether an introduction to this pair would actually reach them.
   *
   * Fetched rather than read: it depends on `users/{uid}/contacts`, which is
   * owner-only, so this client cannot see it however hard it looks. `{}` while
   * it is in flight, which renders as no warning — advice that flickers into
   * view is worse than advice that arrives a moment late.
   */
  const [reach, setReach] = useState<Record<string, Reach>>({});

  /**
   * The safety record, and how it got that way.
   *
   * Fetched for the same reason as the reach: `tutorships` is readable by
   * its two members and this console is neither, and `venueAudit` is closed
   * to every client there is. The Admin SDK is the only reader of either,
   * which makes this drawer the only place the desk can ever see them.
   */
  const [tutorship, setTutorship] = useState<TutorshipView>({
    venue: null,
    audit: [],
  });

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

  // Re-asked whenever either side of the pair changes, because a member can
  // add or withdraw a channel between one connect and the next.
  useEffect(() => {
    const ids = [selectedPerson?.id, selectedTutorId].filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
    if (ids.length === 0) {
      setReach({});
      return;
    }

    let cancelled = false;
    void fetchReach(ids).then((result) => {
      if (!cancelled) setReach(result);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedPerson?.id, selectedTutorId]);

  useEffect(() => {
    const id = selectedPerson?.id;
    if (!id) {
      setTutorship({ venue: null, audit: [] });
      return;
    }

    let cancelled = false;
    void fetchTutorship(id).then((result) => {
      if (!cancelled) setTutorship(result);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedPerson?.id]);

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
        <div className="flex flex-col gap-3">
          <ReachWarning
            learner={person}
            tutor={connectTarget}
            reach={reach}
          />

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

        <TutorshipSection tutorship={tutorship} />
      </div>
    </Drawer>
  );
}

/**
 * Where this tutorship is happening, and every hand that moved it.
 *
 * ## Why the desk sees this at all
 *
 * It is the one thing about a conversation that Slink360 keeps centrally, and
 * it is kept for exactly this: a trainee is about to travel to an address given
 * to them by somebody they met through us. A record only the two of them could
 * read would not be a safety record — it would be a note they passed to each
 * other.
 *
 * ## Why the log is separate from the venue
 *
 * `tutorships/{matchId}` is current state: re-filing a venue merges over it and
 * the previous address is gone. The question a safety review asks is not "where
 * is this tutorship" but "where has it been, and who moved it". `venueAudit`
 * answers that, and it is append-only by rule — `update` and `delete` are
 * refused for everybody, so nothing here can be tidied up after the fact.
 */
function TutorshipSection({ tutorship }: { tutorship: TutorshipView }): ReactNode {
  const { venue, audit } = tutorship;
  if (!venue) return null;

  const settled = venue.status === "confirmed";
  const refused = venue.status === "rejected";

  const place =
    venue.mode === "online"
      ? [venue.platform || "Online", venue.joinDetail].filter(Boolean).join(" · ")
      : [venue.landmark || venue.addressLine, venue.city, venue.venueState]
          .filter(Boolean)
          .join(", ");

  return (
    <Section title="Tutorship location">
      <div
        className={`rounded-lg border p-3 ${
          settled
            ? "border-emerald-500/35 bg-emerald-500/10"
            : refused
              ? "border-rose-500/35 bg-rose-500/10"
              : "border-white/10 bg-white/5"
        }`}
      >
        <p className="flex items-start gap-1.5 text-sm font-medium text-content">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {place || "Filed with no address"}
        </p>

        <dl className="mt-2.5 space-y-1.5 text-xs">
          <MiniRow label="Status">
            {settled
              ? "Agreed — the trainee said they can get there"
              : refused
                ? "Turned down by the trainee"
                : "Filed, waiting on the trainee"}
          </MiniRow>
          <MiniRow label="Mode">
            {venue.mode === "online" ? "Online" : "In person"}
          </MiniRow>
          {venue.skill ? <MiniRow label="Skill">{venue.skill}</MiniRow> : null}
          <MiniRow label="Trainee is in">
            {venue.traineeState || "Not recorded"}
          </MiniRow>
        </dl>

        {/* The one comparison worth making by eye. An in-person tutorship is
            only supposed to run inside one state, and this is the record that
            would show it had not. */}
        {venue.mode !== "online" &&
        venue.traineeState &&
        venue.venueState &&
        venue.traineeState.toLowerCase() !== venue.venueState.toLowerCase() ? (
          <p className="mt-3 flex items-start gap-1.5 text-2xs text-amber-200">
            <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden />
            This venue is in {venue.venueState} and the trainee is recorded in{" "}
            {venue.traineeState}. In-person tutorships are meant to stay inside
            one state.
          </p>
        ) : null}
      </div>

      {audit.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-2xs uppercase tracking-wide text-content-muted">
            <History className="h-3 w-3" aria-hidden />
            History
          </p>
          <ol className="space-y-1 text-xs text-content-muted">
            {audit.map((entry, index) => (
              <li key={`${entry.at ?? index}-${entry.outcome}`}>
                <span className="text-content">{AUDIT_LABELS[entry.outcome] ?? entry.outcome}</span>
                {entry.venueState ? ` · ${entry.venueState}` : ""}
                {entry.at ? ` · ${new Date(entry.at).toLocaleString()}` : ""}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </Section>
  );
}

const AUDIT_LABELS: Record<string, string> = {
  filed: "Venue filed",
  refiled: "Venue changed",
  confirmed: "Trainee agreed",
  rejected: "Trainee turned it down",
  contactsShared: "Details released",
};

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

/**
 * Whether this introduction would actually reach the two people in it.
 *
 * ## Why this is a warning and not a block
 *
 * An email that says "you have been matched" and carries no way to contact the
 * other person is worse than no email: it raises an expectation the product
 * cannot meet, to two people at once. So the desk is told before it happens.
 *
 * It does not stop them. A desk that knows the person and is about to ring
 * them anyway has a reason the console cannot see, and a console that refuses
 * to let a human do their job gets worked around rather than heeded.
 *
 * ## The two things it distinguishes
 *
 * **No account** is not a fault — 38 of 40 registrations came from the website
 * and their owners have never opened the app. It means the email is all they
 * will get: no match card, no venue, nothing to accept.
 *
 * **An account with no channels** is the one worth pausing on. They installed
 * the app and chose to share nothing, so there is nothing to put in the
 * introduction, and the other person will be told they have been matched with
 * somebody unreachable.
 */
function ReachWarning({
  learner,
  tutor,
  reach,
}: {
  learner: Person;
  tutor: Person | null;
  reach: Record<string, Reach>;
}): ReactNode {
  if (!tutor) return null;

  const sides = [
    { who: firstName(learner.name) || "This learner", state: reach[learner.id] },
    { who: firstName(tutor.name) || "This tutor", state: reach[tutor.id] },
  ];

  // Silent until the answer is in. Advice that flickers into view is worse
  // than advice that arrives a moment late.
  if (sides.some((side) => side.state === undefined)) return null;

  const unreachable = sides.filter(
    (side) => side.state!.hasAccount && side.state!.channels === 0,
  );
  const appless = sides.filter((side) => !side.state!.hasAccount);

  if (unreachable.length === 0 && appless.length === 0) return null;

  const lines: string[] = [];
  for (const side of unreachable) {
    lines.push(
      `${side.who} has the app but has not chosen any way to be reached, so the introduction will carry nothing for them.`,
    );
  }
  if (appless.length > 0) {
    lines.push(
      `${appless.map((side) => side.who).join(" and ")} ${
        appless.length === 1 ? "has" : "have"
      } not opened the app, so the email is all ${
        appless.length === 1 ? "they get" : "they get"
      } — no venue to agree, nothing to accept.`,
    );
  }

  const severe = unreachable.length > 0;

  return (
    <div
      role="status"
      className={`flex gap-2 rounded-lg border p-3 text-sm ${
        severe
          ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
          : "border-white/10 bg-white/5 text-white/70"
      }`}
    >
      <AlertTriangle
        className={`mt-0.5 h-4 w-4 shrink-0 ${severe ? "text-amber-400" : "text-white/40"}`}
        aria-hidden
      />
      <div className="flex flex-col gap-1">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}
