"use client";

import { useEffect, useState } from "react";

import { useRegistry } from "@/components/providers/registry-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

/**
 * Destructive-delete confirmation.
 *
 * Requires the registrant's name to be typed exactly — same guard as before —
 * because the write is an unrecoverable `deleteDoc`.
 */
export function DeleteDialog() {
  const { pendingRemoval, requestRemoval, confirmRemoval } = useRegistry();
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setTyped("");
    setDeleting(false);
  }, [pendingRemoval]);

  if (!pendingRemoval) return null;

  const person = pendingRemoval;
  const target = person.name.trim().toLowerCase();
  const matches = typed.trim().toLowerCase() === target && target.length > 0;

  const handleDelete = async (): Promise<void> => {
    setDeleting(true);
    try {
      await confirmRemoval(person);
    } catch {
      // Provider surfaced the failure; let the operator retry.
      setDeleting(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => requestRemoval(null)}
      title="Delete registration"
      description={
        <>
          This permanently removes{" "}
          <span className="font-medium text-content">{person.name}</span> and all of their
          data from the database. This cannot be undone.
        </>
      }
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={() => requestRemoval(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="lg"
            disabled={!matches || deleting}
            loading={deleting}
            onClick={() => void handleDelete()}
          >
            {deleting ? "Deleting…" : "Delete registration"}
          </Button>
        </>
      }
    >
      <label className="block">
        <span className="text-xs font-medium text-content-muted">
          Type <span className="font-semibold text-content">{person.name}</span> to confirm
        </span>
        <Input
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={person.name || "Registrant name"}
          autoComplete="off"
          autoFocus
          aria-label="Confirm the registrant name"
          className="mt-1.5 h-9"
        />
      </label>
    </Modal>
  );
}
