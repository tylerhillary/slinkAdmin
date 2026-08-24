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
import { useCollection } from "@/hooks/use-collection";
import { adaptPerson } from "@/lib/adapters/person";
import { adaptSubmission } from "@/lib/adapters/submission";
import {
  countSegments,
  filterPeople,
  mergeSubmissions,
  searchPeople,
  sortByNewest,
} from "@/lib/domain/registry";
import { initAnalytics, registrationsRef, submissionsRef } from "@/lib/firebase/client";
import {
  connectPerson as connectPersonWrite,
  queueMatchEmails,
  removePerson as removePersonWrite,
  revertToPending,
  setMailedStatus,
} from "@/lib/firebase/mutations";
import type { FilterKey, Person, PersonStatus, SegmentCounts, Submission } from "@/types";

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
  connectToTutor: (learner: Person, tutor: Person) => Promise<void>;
  confirmRemoval: (person: Person) => Promise<void>;
}

const RegistryContext = createContext<RegistryContextValue | null>(null);

export function RegistryProvider({ children }: { children: ReactNode }) {
  const { notify } = useToast();

  const registrations = useCollection<Person>(registrationsRef, adaptPerson);
  const submissions = useCollection<Submission>(submissionsRef, adaptSubmission);

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
      notify("Realtime updates are unavailable. Showing the latest snapshot.", "warning");
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
      } catch (error) {
        console.error("Failed to update mailed status", error);
        notify("Failed to update mailed status. Try again.", "error");
      } finally {
        clearPatch(person.id);
      }
    },
    [applyPatch, clearPatch, notify],
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
      } catch (error) {
        console.error("Failed to revert status", error);
        notify("Could not move this learner back to pending.", "error");
      } finally {
        clearPatch(person.id);
      }
    },
    [applyPatch, clearPatch, notify],
  );

  const connectToTutor = useCallback(
    async (learner: Person, tutor: Person) => {
      applyPatch(learner.id, { status: "connected" });
      try {
        await connectPersonWrite(learner, tutor);
        await queueMatchEmails(learner, tutor);
        notify(`Connected ${learner.name} to ${tutor.name}.`);
      } catch (error) {
        console.error("Failed to connect learner to tutor", error);
        notify("Database update failed. Please retry.", "error");
        throw error;
      } finally {
        clearPatch(learner.id);
      }
    },
    [applyPatch, clearPatch, notify],
  );

  const confirmRemoval = useCallback(
    async (person: Person) => {
      try {
        await removePersonWrite(person.id);
        notify(`${person.name} has been deleted from the database.`, "warning");
        setPendingRemovalId(null);
        setSelectedPersonId((current) => (current === person.id ? null : current));
      } catch (error) {
        console.error("Failed to delete registration", error);
        notify("Deletion failed. Please try again.", "error");
        throw error;
      }
    },
    [notify],
  );

  const value = useMemo<RegistryContextValue>(
    () => ({
      people,
      visiblePeople,
      mailedPeople,
      counts,
      loading: registrations.loading,
      error: registrations.error,
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
      confirmRemoval,
    }),
    [
      people,
      visiblePeople,
      mailedPeople,
      counts,
      registrations.loading,
      registrations.error,
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
