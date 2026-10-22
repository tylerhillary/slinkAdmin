"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useToast } from "@/components/providers/toast-provider";
import { useRegistryFeed } from "@/hooks/use-registry-feed";
import {
  countSegments,
  filterPeople,
  mergeSubmissions,
  searchPeople,
  sortByNewest,
} from "@/lib/domain/registry";
import { initAnalytics } from "@/lib/firebase/client";
import {
  connectPerson as connectPersonWrite,
  sendIntroduction as sendIntroductionWrite,
  removePerson as removePersonWrite,
  revertToPending,
  setMailedStatus,
} from "@/lib/firebase/mutations";
import { firstName } from "@/lib/domain/format";
import type {
  FilterKey,
  IntroductionDelivery,
  IntroductionMessage,
  MailerStatus,
  Person,
  PersonStatus,
  SegmentCounts,
  Submission,
  ToastTone,
} from "@/types";

function namesOf(messages: IntroductionMessage[]): string {
  return messages.map((message) => message.name).join(" and ");
}

/**
 * One line for the toast after an introduction, saying what actually happened.
 * "Sent" is only ever claimed for an email Gmail accepted.
 */
function summariseDelivery(delivery: IntroductionDelivery): { text: string; tone: ToastTone } {
  if (delivery.mode === "draft") {
    return {
      text: "The two introduction emails are ready as drafts. Open them from the record to send.",
      tone: "warning",
    };
  }

  const sent = delivery.messages.filter((message) => message.status === "sent");
  const missed = delivery.messages.filter((message) => message.status !== "sent");

  if (sent.length > 0 && missed.length === 0) {
    return { text: `Introduction emailed to ${namesOf(sent)}.`, tone: "success" };
  }
  if (sent.length > 0) {
    return {
      text: `Emailed ${namesOf(sent)}, but not ${namesOf(missed)}. See the record.`,
      tone: "warning",
    };
  }
  return { text: "The introduction emails were not sent. See the record.", tone: "error" };
}

/** Local overrides applied on top of snapshot data while a write is in flight. */
interface OptimisticPatch {
  mailed?: boolean;
  status?: PersonStatus;
}

interface RegistryContextValue {
  people: Person[];
  visiblePeople: Person[];
  mailedPeople: Person[];
  counts: SegmentCounts;
  loading: boolean;
  error: Error | null;

  /**
   * When the data on screen was last confirmed against the server, and a way
   * to confirm it now.
   *
   * Worth surfacing because this is a poll rather than a live subscription:
   * "as of a moment ago" is a different claim from "live", and the console
   * should be able to make the honest one.
   */
  fetchedAt: Date | null;
  refresh: () => Promise<void>;

  activeFilter: FilterKey;
  setActiveFilter: (filter: FilterKey) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;

  selectedPerson: Person | null;
  selectPerson: (person: Person | null) => void;
  pendingRemoval: Person | null;
  requestRemoval: (person: Person | null) => void;

  toggleMailed: (person: Person, mailed: boolean) => Promise<void>;
  setConnected: (person: Person, connected: boolean) => Promise<void>;
  /** Connects and announces it. Resolves to what happened to each email. */
  connectToTutor: (learner: Person, tutor: Person) => Promise<IntroductionDelivery>;
  /** Announces an existing connection: past ones, or any whose emails failed. */
  sendIntroduction: (learner: Person) => Promise<IntroductionDelivery>;
  /** Whether the server sends mail itself or hands the desk drafts. Null until loaded. */
  mailer: MailerStatus | null;
  confirmRemoval: (person: Person) => Promise<void>;
}

const RegistryContext = createContext<RegistryContextValue | null>(null);

export function RegistryProvider({ children }: { children: ReactNode }) {
  const { notify } = useToast();

  // Reads come from this project's own server now, not from Firestore in the
  // browser — see hooks/use-registry-feed.ts for why, and what that costs.
  const {
    people: registrations,
    submissions,
    refresh,
    fetchedAt,
    mailer,
  } = useRegistryFeed();

  const [activeFilter, setActiveFilterState] = useState<FilterKey>("registered");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, OptimisticPatch>>({});

  useEffect(() => {
    void initAnalytics();
  }, []);

  useEffect(() => {
    if (registrations.error) {
      notify(
        `Could not refresh: ${registrations.error.message} Showing the last data received.`,
        "warning",
      );
    }
  }, [registrations.error, notify]);

  const submissionMap = useMemo(() => {
    const map = new Map<string, Submission>();
    for (const submission of submissions.data) {
      map.set(submission.id, submission);
    }
    return map;
  }, [submissions.data]);

  /** Snapshot data, joined with submissions, sorted, then patched optimistically. */
  const people = useMemo(() => {
    const merged = mergeSubmissions(registrations.data, submissionMap);
    const sorted = sortByNewest(merged);

    if (Object.keys(optimistic).length === 0) return sorted;

    return sorted.map((person) => {
      const override = optimistic[person.id];
      if (!override) return person;

      return {
        ...person,
        status: override.status ?? person.status,
        flags: {
          ...person.flags,
          mailed: override.mailed ?? person.flags.mailed,
        },
      };
    });
  }, [registrations.data, submissionMap, optimistic]);

  const counts = useMemo(() => countSegments(people), [people]);

  const visiblePeople = useMemo(
    () => searchPeople(filterPeople(people, activeFilter), searchQuery),
    [people, activeFilter, searchQuery],
  );

  const mailedPeople = useMemo(
    () => people.filter((person) => person.flags.mailed),
    [people],
  );

  const selectedPerson = useMemo(
    () => people.find((person) => person.id === selectedPersonId) ?? null,
    [people, selectedPersonId],
  );

  const pendingRemoval = useMemo(
    () => people.find((person) => person.id === pendingRemovalId) ?? null,
    [people, pendingRemovalId],
  );

  // A record that disappears from the snapshot (deleted elsewhere) must not
  // leave the drawer stranded on stale data.
  useEffect(() => {
    if (selectedPersonId && !registrations.loading && !selectedPerson) {
      setSelectedPersonId(null);
    }
  }, [selectedPersonId, selectedPerson, registrations.loading]);

  const applyPatch = useCallback((id: string, value: OptimisticPatch) => {
    setOptimistic((current) => ({ ...current, [id]: { ...current[id], ...value } }));
  }, []);

  const clearPatch = useCallback((id: string) => {
    setOptimistic((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const setActiveFilter = useCallback((filter: FilterKey) => {
    setActiveFilterState(filter);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setActiveFilterState("registered");
  }, []);

  const selectPerson = useCallback((person: Person | null) => {
    setSelectedPersonId(person?.id ?? null);
  }, []);

  const requestRemoval = useCallback((person: Person | null) => {
    setPendingRemovalId(person?.id ?? null);
  }, []);

  const toggleMailed = useCallback(
    async (person: Person, mailed: boolean) => {
      applyPatch(person.id, { mailed });
      try {
        await setMailedStatus(person.id, mailed);
        notify(
          mailed
            ? `${person.name} marked as mailed.`
            : `Mailed flag cleared for ${person.name}.`,
        );
        // The optimistic patch is cleared below, so the row would snap back to
        // its pre-write value until the next poll. Re-read first.
        await refresh();
      } catch (error) {
        console.error("Failed to update mailed status", error);
        notify("Failed to update mailed status. Try again.", "error");
      } finally {
        clearPatch(person.id);
      }
    },
    [applyPatch, clearPatch, notify, refresh],
  );

  const setConnected = useCallback(
    async (person: Person, connected: boolean) => {
      if (connected) {
        // Connecting requires a tutor; the record drawer owns that selection.
        notify("Open the record and choose a tutor to connect this learner.", "warning");
        return;
      }

      applyPatch(person.id, { status: "pending" });
      try {
        await revertToPending(person.id);
        notify(`${person.name} moved back to pending.`);
        await refresh();
      } catch (error) {
        console.error("Failed to revert status", error);
        notify("Could not move this learner back to pending.", "error");
      } finally {
        clearPatch(person.id);
      }
    },
    [applyPatch, clearPatch, notify, refresh],
  );

  const connectToTutor = useCallback(
    async (learner: Person, tutor: Person) => {
      applyPatch(learner.id, { status: "connected" });
      try {
        const delivery = await connectPersonWrite(learner, tutor);
        const summary = summariseDelivery(delivery);
        notify(
          `Connected ${firstName(learner.name)} to ${firstName(tutor.name)}. ${summary.text}`,
          summary.tone,
        );
        await refresh();
        return delivery;
      } catch (error) {
        console.error("Failed to connect learner to tutor", error);
        notify(
          error instanceof Error ? error.message : "Could not connect them. Please retry.",
          "error",
        );
        throw error;
      } finally {
        clearPatch(learner.id);
      }
    },
    [applyPatch, clearPatch, notify, refresh],
  );

  const sendIntroduction = useCallback(
    async (learner: Person) => {
      try {
        const delivery = await sendIntroductionWrite(learner.id);
        const summary = summariseDelivery(delivery);
        notify(summary.text, summary.tone);
        await refresh();
        return delivery;
      } catch (error) {
        console.error("Failed to send the introduction", error);
        notify(
          error instanceof Error ? error.message : "Could not send the introduction.",
          "error",
        );
        throw error;
      }
    },
    [notify, refresh],
  );

  const confirmRemoval = useCallback(
    async (person: Person) => {
      try {
        await removePersonWrite(person.id);
        notify(`${person.name} has been deleted from the database.`, "warning");
        setPendingRemovalId(null);
        setSelectedPersonId((current) => (current === person.id ? null : current));
        await refresh();
      } catch (error) {
        console.error("Failed to delete registration", error);
        notify("Deletion failed. Please try again.", "error");
        throw error;
      }
    },
    [notify, refresh],
  );

  const value = useMemo<RegistryContextValue>(
    () => ({
      people,
      visiblePeople,
      mailedPeople,
      counts,
      loading: registrations.loading,
      error: registrations.error,
      fetchedAt,
      refresh,
      activeFilter,
      setActiveFilter,
      searchQuery,
      setSearchQuery,
      resetFilters,
      selectedPerson,
      selectPerson,
      pendingRemoval,
      requestRemoval,
      toggleMailed,
      setConnected,
      connectToTutor,
      sendIntroduction,
      mailer,
      confirmRemoval,
    }),
    [
      people,
      visiblePeople,
      mailedPeople,
      counts,
      registrations.loading,
      registrations.error,
      fetchedAt,
      refresh,
      activeFilter,
      setActiveFilter,
      searchQuery,
      resetFilters,
      selectedPerson,
      selectPerson,
      pendingRemoval,
      requestRemoval,
      toggleMailed,
      setConnected,
      connectToTutor,
      sendIntroduction,
      mailer,
      confirmRemoval,
    ],
  );

  return <RegistryContext.Provider value={value}>{children}</RegistryContext.Provider>;
}

export function useRegistry(): RegistryContextValue {
  const context = useContext(RegistryContext);
  if (!context) {
    throw new Error("useRegistry must be used within a RegistryProvider");
  }
  return context;
}
