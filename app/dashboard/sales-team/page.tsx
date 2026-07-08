import { DashboardShell } from "@/components/DashboardShell";
import { SalesTeamManager } from "@/components/SalesTeamManager";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserSubscription } from "@/lib/subscription";

export default async function SalesTeamPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <DashboardShell>
        <div className="empty-state">
          <h2>Please sign in first</h2>
          <p className="muted">Login to manage your sales team.</p>
        </div>
      </DashboardShell>
    );
  }

  const subscription = await getUserSubscription(user.id);

  return (
    <DashboardShell>
      <div className="page-hero">
        <div>
          <span className="badge">Agency Team</span>
          <h1 style={{ fontSize: 46 }}>Sales Team</h1>
          <p className="muted">
            Create sales users with unique Staff ID and PIN. Agency includes 3 sales seats.
          </p>
        </div>

        <div className="hero-mini-card">
          <strong>3</strong>
          <span>Included seats</span>
        </div>
      </div>

      <SalesTeamManager currentPlan={subscription.plan} />
    </DashboardShell>
  );
}