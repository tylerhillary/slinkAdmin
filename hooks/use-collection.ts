"use client";

import { onSnapshot, type CollectionReference, type QueryDocumentSnapshot } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";

import type { RealtimeState } from "@/types";

/**
 * Subscribes to a Firestore collection and maps each document through `adapt`.
 *
 * The adapter is held in a ref so callers can pass an inline function without
 * re-subscribing on every render — the subscription's identity is the
 * collection reference alone.
 */
export function useCollection<T>(
  reference: CollectionReference,
  adapt: (snapshot: QueryDocumentSnapshot) => T,
): RealtimeState<T[]> {
  const adaptRef = useRef(adapt);
  adaptRef.current = adapt;

  const [state, setState] = useState<RealtimeState<T[]>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      reference,
      (snapshot) => {
        setState({
          data: snapshot.docs.map((docSnap) => adaptRef.current(docSnap)),
          loading: false,
          error: null,
        });
      },
      (error) => {
        console.error(`Realtime subscription failed for ${reference.path}`, error);
        setState((previous) => ({ ...previous, loading: false, error }));
      },
    );

    return unsubscribe;
  }, [reference]);

  return state;
}
