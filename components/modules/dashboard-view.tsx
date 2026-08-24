"use client";

import { AlertTriangle } from "lucide-react";
import { useMemo } from "react";

import { DeleteDialog } from "@/components/modules/delete-dialog";
import { FilterToolbar } from "@/components/modules/filter-toolbar";
import { MailQueuePanel } from "@/components/modules/mail-queue-panel";
import { MetricGrid } from "@/components/modules/metric-grid";
import { OperationsPanel } from "@/components/modules/operations-panel";
import { PersonDrawer } from "@/components/modules/person-drawer";
import { RegistryTable } from "@/components/modules/registry-table";
import { useRegistry } from "@/components/providers/registry-provider";
import { Card, CardHeader } from "@/components/ui/card";
import { useRowSelection } from "@/hooks/use-row-selection";
import { formatInteger } from "@/lib/domain/format";
import { findNavItem } from "@/lib/navigation";

/**
 * The console's primary workspace: metrics, operational read-out, the live
 * registration queue, and the overlays that act on it.
 */
export function DashboardView() {
  const { visiblePeople, activeFilter, loading, error, counts } = useRegistry();

  const visibleIds = useMemo(
    () => visiblePeople.map((person) => person.id),
    [visiblePeople],
  );
  const selection = useRowSelection(visibleIds);
  const navItem = findNavItem(activeFilter);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Page heading */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-content">
          {navItem.title}
        </h1>
        <p className="max-w-2xl text-sm text-content-muted">{navItem.description}</p>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2.5"
        >
          <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-warning" aria-hidden />
          <div className="text-xs text-warning">
            <p className="font-medium">Realtime sync interrupted</p>
            <p className="mt-0.5 opacity-90">
              The console is showing the last snapshot it received. Writes may fail until the
              connection recovers.
            </p>
          </div>
        </div>
      ) : null}

      <MetricGrid />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card flush className="min-w-0">
          <div className="space-y-4 p-4 sm:p-5">
            <CardHeader
              eyebrow="Live"
              title="Registration Queue"
              description="Sorted newest first. Select a row to review readiness and matched tutors."
              actions={
                <span className="tabular text-2xs text-content-subtle">
                  {formatInteger(visiblePeople.length)} of {formatInteger(counts.registered)}{" "}
                  records
                </span>
              }
            />
            <FilterToolbar selection={selection} rows={visiblePeople} />
          </div>

          <div className="border-t border-line">
            <RegistryTable rows={visiblePeople} selection={selection} loading={loading} />
          </div>
        </Card>

        <div className="min-w-0 xl:sticky xl:top-[4.5rem] xl:self-start">
          <OperationsPanel />
        </div>
      </div>

      {activeFilter === "mailed" ? <MailQueuePanel /> : null}

      <PersonDrawer />
      <DeleteDialog />
    </div>
  );
}
