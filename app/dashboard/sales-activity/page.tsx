import { DashboardShell } from "@/components/DashboardShell";
import { SalesActivityTracker } from "@/components/SalesActivityTracker";

export const dynamic = "force-dynamic";

export default function SalesActivityPage() {
  return (
    <DashboardShell>
      <SalesActivityTracker />
    </DashboardShell>
  );
}
