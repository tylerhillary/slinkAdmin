"use client";

import { RefreshCw, ServerCrash } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Segment-level error boundary. The shell stays mounted around it. */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard segment failed", error);
  }, [error]);

  return (
    <Card className="mx-auto mt-8 max-w-lg text-center">
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-danger/25 bg-danger-soft text-danger">
        <ServerCrash className="h-4 w-4" aria-hidden />
      </span>

      <h1 className="mt-3 text-base font-semibold text-content">
        The console could not load this view
      </h1>
      <p className="mt-1.5 text-sm text-content-muted">
        The registration data source did not respond as expected. Retrying re-establishes the
        realtime subscription without reloading the page.
      </p>

      {error.digest ? (
        <code className="mt-3 inline-block rounded bg-surface-subtle px-2 py-1 font-mono text-2xs text-content-subtle">
          {error.digest}
        </code>
      ) : null}

      <Button
        variant="primary"
        size="lg"
        onClick={reset}
        className="mx-auto mt-4"
        leading={<RefreshCw className="h-4 w-4" aria-hidden />}
      >
        Retry
      </Button>
    </Card>
  );
}
