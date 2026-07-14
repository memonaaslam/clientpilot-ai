import Link from "next/link";

import { DashboardShell } from "@/components/DashboardShell";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import {
  OwnerAccessError,
  requireOwnerUser
} from "@/lib/owner-auth";

export const dynamic = "force-dynamic";

export default async function OwnerDashboardPage() {
  try {
    const owner = await requireOwnerUser();

    return (
      <DashboardShell>
        <OwnerDashboard
          ownerEmail={owner.email || "Makzora Owner"}
        />
      </DashboardShell>
    );
  } catch (error) {
    const message =
      error instanceof OwnerAccessError
        ? error.message
        : "Unable to verify Owner Dashboard access.";

    return (
      <DashboardShell>
        <div className="cp-owner-restricted">
          <span>PRIVATE</span>

          <h1>Owner access required</h1>

          <p>{message}</p>

          <Link href="/dashboard">
            Return to Dashboard
          </Link>
        </div>
      </DashboardShell>
    );
  }
}