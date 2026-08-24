import type { ReactNode } from "react";

import { AppShell } from "@/components/modules/app-shell";
import { RegistryProvider } from "@/components/providers/registry-provider";

/**
 * Dashboard segment layout.
 *
 * The registry provider sits above the shell so the sidebar, top bar and
 * command palette all read from the same realtime snapshot as the queue.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RegistryProvider>
      <AppShell>{children}</AppShell>
    </RegistryProvider>
  );
}
