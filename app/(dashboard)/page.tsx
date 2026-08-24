import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardView } from "@/components/modules/dashboard-view";

import Loading from "./loading";

export const metadata: Metadata = {
  title: "Registration Overview",
};

/**
 * Server Component entry point.
 *
 * The workspace itself is a Client Component because the data source is a
 * Firestore realtime subscription; the Suspense boundary keeps the shell
 * painted while that client bundle resolves.
 */
export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardView />
    </Suspense>
  );
}
