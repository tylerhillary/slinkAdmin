"use client";

import { useEffect } from "react";

/**
 * Root error boundary. Replaces the whole document, so it ships its own
 * `<html>`/`<body>` and inline styling rather than relying on the app shell.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unrecoverable application error", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0d0d10",
          color: "#e8e8ee",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>
            Slink Admin failed to start
          </h1>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "0.8125rem",
              lineHeight: 1.6,
              color: "#9b9baa",
            }}
          >
            An unrecoverable error occurred while booting the console. Reloading usually
            resolves it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.25rem",
              height: "2.25rem",
              padding: "0 1rem",
              borderRadius: "0.5rem",
              border: "none",
              backgroundColor: "#4f5fe8",
              color: "#fff",
              fontSize: "0.8125rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload console
          </button>
        </div>
      </body>
    </html>
  );
}
