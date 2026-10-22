import type { ReactNode } from "react";

import { AppShell } from "@/components/modules/app-shell";
import { AuthGate } from "@/components/providers/auth-gate";
import { RegistryProvider } from "@/components/providers/registry-provider";

/**
 * Dashboard segment layout.
 *
 * The gate is outermost so the registry provider never mounts — and therefore
 * never fetches — for somebody who is not signed in. The provider then sits
 * above the shell so the sidebar, top bar and command palette all read from
 * the same feed as the queue.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <RegistryProvider>
        <AppShell>{children}</AppShell>
      </RegistryProvider>
    </AuthGate>
  );
}
