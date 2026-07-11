import { DashboardShell } from "@/components/DashboardShell";
import { FollowUpAssistant } from "@/components/FollowUpAssistant";

export const dynamic = "force-dynamic";

export default function FollowUpsPage() {
  return (
    <DashboardShell>
      <FollowUpAssistant />
    </DashboardShell>
  );
}
