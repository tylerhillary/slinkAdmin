"use client";

import { useEffect, useState } from "react";

/** Tracks a CSS media query. Returns `false` during SSR and first paint. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);

    const onChange = (event: MediaQueryListEvent): void => setMatches(event.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** `true` at the `lg` breakpoint and above. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
