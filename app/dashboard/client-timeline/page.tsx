import { DashboardShell } from "@/components/DashboardShell";
import { ClientTimeline } from "@/components/ClientTimeline";

export const dynamic = "force-dynamic";

export default function ClientTimelinePage() {
  return (
    <DashboardShell>
      <ClientTimeline />
    </DashboardShell>
  );
}
